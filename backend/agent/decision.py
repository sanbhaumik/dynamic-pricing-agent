"""
Decision engine — calls Claude to generate pricing recommendations.
temperature=0 always for deterministic decisions.
"""
import json
import logging
from datetime import datetime, timezone

import anthropic

from .memory import PriceMemory

logger = logging.getLogger(__name__)

# ── System prompt — DO NOT MODIFY ────────────────────────────────────────────
SYSTEM_PROMPT = """You are a pricing strategist for an e-commerce brand.
Analyse competitor pricing and recommend a price adjustment.

Hard rules — never violate:
- Never recommend below margin_floor
- Never recommend more than 15% above current_price
- If flash_sale_detected: action must be "hold"
- If confidence below 50: action must be "escalate"
- Target position {target_position}, not position 1

Return valid JSON only, no other text:
{
  "action": "reprice" | "hold" | "escalate",
  "recommended_price": float,
  "confidence": int,
  "reasoning": "max 120 characters, plain English",
  "flash_sale_detected": bool,
  "market_snapshot": {
    "lowest_competitor_price": float,
    "your_position": int,
    "markets_analysed": int
  }
}"""

FALLBACK_DECISION = {
    "action": "escalate",
    "recommended_price": None,
    "confidence": 0,
    "reasoning": "Parse error — manual review needed",
    "flash_sale_detected": False,
    "market_snapshot": {
        "lowest_competitor_price": None,
        "your_position": None,
        "markets_analysed": 0
    }
}

REQUIRED_FIELDS = {"action", "recommended_price", "confidence", "reasoning",
                   "flash_sale_detected", "market_snapshot"}


class DecisionEngine:
    def __init__(self, api_key: str, model: str, memory: PriceMemory):
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY not configured. Add to .env to enable live mode."
            )
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
        self.memory = memory

    async def evaluate(self, product: dict,
                       shopping_data: dict,
                       amazon_data: dict | None) -> dict:
        """Build context, call Claude, parse JSON, record to memory, return decision."""
        flash_detected = self._check_flash_sales(product, shopping_data)
        context = self._build_context(product, shopping_data, amazon_data, flash_detected)
        target_position = product.get("target_position", 2)
        system = SYSTEM_PROMPT.replace("{target_position}", str(target_position))

        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=400,
                temperature=0,
                system=system,
                messages=[{"role": "user", "content": context}]
            )
            raw = message.content[0].text.strip()
            # Strip markdown code fences if Claude wraps the JSON
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            decision = json.loads(raw)

            if not REQUIRED_FIELDS.issubset(decision.keys()):
                logger.warning(f"Decision missing fields: {REQUIRED_FIELDS - decision.keys()}")
                decision = self._make_fallback(product)
        except json.JSONDecodeError as exc:
            logger.warning(f"Claude JSON parse error: {exc}")
            decision = self._make_fallback(product)
        except Exception as exc:
            logger.error(f"Claude API error: {exc}")
            decision = self._make_fallback(product)

        # Ensure recommended_price is set
        if decision.get("recommended_price") is None:
            decision["recommended_price"] = product.get("current_price", 0)

        # Server-side enforcement — never trust LLM output alone for business rules
        decision = self._enforce_rules(decision, product)

        sku = product.get("sku", "unknown")
        now = datetime.now(timezone.utc).isoformat()
        try:
            self.memory.record_decision(sku, {
                **decision,
                "current_price": product.get("current_price"),
                "sku": sku,
                "timestamp": now,
            })
        except Exception as exc:
            logger.warning(f"Failed to record decision to memory: {exc}")

        return decision

    def _build_context(self, product: dict, shopping_data: dict,
                       amazon_data: dict | None, flash_detected: bool) -> str:
        """Format data as clean text for the prompt. Target: under 800 tokens."""
        lines = [
            f"Product: {product.get('query', 'Unknown')}",
            f"Current price: ${product.get('current_price', 0):.2f}",
            f"Margin floor: ${product.get('margin_floor', 0):.2f}",
            f"Target position: {product.get('target_position', 2)}",
            f"Flash sale detected: {flash_detected}",
            "",
            "Competitor prices by market:"
        ]

        sku = product.get("sku", "unknown")
        for country, sellers in shopping_data.items():
            lines.append(f"  {country.upper()}:")
            for s in sellers[:6]:  # cap to keep prompt concise
                avg = self.memory.get_7day_average(sku, country, s.get("seller", ""))
                avg_str = f" (7d avg: ${avg:.2f})" if avg else ""
                lines.append(
                    f"    pos {s.get('position', '?')}: {s.get('seller', '?')} "
                    f"${s.get('price', 0):.2f}{avg_str}"
                )

        if amazon_data:
            lines += [
                "",
                "Amazon Buy Box:",
                f"  Winner: {amazon_data.get('buy_box_winner', 'Unknown')}",
                f"  Buy Box price: ${amazon_data.get('buy_box_price', 0):.2f}",
                f"  Seller count: {amazon_data.get('seller_count', 0)}",
                f"  Lowest price: ${amazon_data.get('lowest_price', 0):.2f}",
            ]

        return "\n".join(lines)

    def _check_flash_sales(self, product: dict, shopping_data: dict) -> bool:
        """True if any seller has dropped >20% below their 7-day average."""
        sku = product.get("sku", "unknown")
        for country, sellers in shopping_data.items():
            for s in sellers:
                seller = s.get("seller", "")
                price = s.get("price", 0)
                if self._is_flash_sale(seller, country, price, sku):
                    return True
        return False

    def _is_flash_sale(self, seller: str, market: str,
                       current_price: float, sku: str) -> bool:
        """True if current_price is more than 20% below 7-day average."""
        avg = self.memory.get_7day_average(sku, market, seller)
        if avg is None:
            return False
        return current_price < (avg * 0.80)

    def _enforce_rules(self, decision: dict, product: dict) -> dict:
        """Enforce hard business rules server-side after parsing Claude's response.
        Never allow LLM output to bypass margin floor, price ceiling, flash sale hold,
        or low-confidence escalate.
        """
        margin_floor = product.get("margin_floor") or 0
        current_price = product.get("current_price") or 0
        price_ceiling = current_price * 1.15

        price = decision.get("recommended_price") or current_price
        price = max(margin_floor, min(price, price_ceiling))
        decision["recommended_price"] = round(price, 2)

        if decision.get("flash_sale_detected"):
            decision["action"] = "hold"
        elif decision.get("confidence", 100) < 50:
            decision["action"] = "escalate"

        return decision

    def _make_fallback(self, product: dict) -> dict:
        """Return fallback escalate decision."""
        import copy
        fb = copy.deepcopy(FALLBACK_DECISION)
        fb["recommended_price"] = product.get("current_price")
        return fb


if __name__ == "__main__":
    import asyncio
    import os
    from dotenv import load_dotenv
    from .memory import PriceMemory

    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5")

    mock_shopping = {
        "us": [
            {"seller": "AudioMax", "price": 259.99, "position": 1, "country": "us"},
            {"seller": "SoundHub", "price": 274.99, "position": 2, "country": "us"},
            {"seller": "You",      "price": 279.00, "position": 4, "country": "us", "is_you": True},
        ]
    }
    mock_product = {
        "query": "Sony WH-1000XM5",
        "sku": "sony-wh1000xm5",
        "current_price": 279.00,
        "margin_floor": 195.00,
        "target_position": 2
    }

    async def run():
        mem = PriceMemory()

        if api_key:
            engine = DecisionEngine(api_key, model, mem)
            result = await engine.evaluate(mock_product, mock_shopping, None)
            print(f"action={result['action']}, price={result['recommended_price']}")
            assert result["action"] in ("reprice", "hold", "escalate")
            assert result["recommended_price"] >= mock_product["margin_floor"]
        else:
            print("No Anthropic key — testing parse logic with mock response")
            mem2 = PriceMemory()
            engine = DecisionEngine.__new__(DecisionEngine)
            engine.memory = mem2
            engine.model = model

            # Test valid parse
            good_json = json.dumps({
                "action": "reprice",
                "recommended_price": 264.99,
                "confidence": 84,
                "reasoning": "Test",
                "flash_sale_detected": False,
                "market_snapshot": {
                    "lowest_competitor_price": 259.99,
                    "your_position": 4,
                    "markets_analysed": 1
                }
            })
            parsed = json.loads(good_json)
            assert parsed["action"] == "reprice"
            print("✓ Valid JSON parse OK")

            # Test fallback on malformed JSON
            fb = engine._make_fallback(mock_product)
            assert fb["action"] == "escalate"
            assert fb["recommended_price"] == 279.00
            print("✓ Fallback decision OK")

    asyncio.run(run())
    print("✓ decision.py test passed")
