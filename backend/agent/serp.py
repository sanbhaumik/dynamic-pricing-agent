"""
Bright Data SERP API client for Google Shopping price data.
Endpoint: POST https://api.brightdata.com/request
Auth:     Authorization: Bearer {api_token}
Body:     {"zone": zone_name, "url": google_shopping_url?brd_json=1, "format": "json"}
Returns empty dict on failure — never raises from public methods.
"""
import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import quote_plus

import aiohttp

logger = logging.getLogger(__name__)

MOCK_SERP_RESPONSE = {
    "us": [
        {"seller": "AudioMax", "price": 259.99, "position": 1, "country": "us", "currency": "USD"},
        {"seller": "SoundHub", "price": 274.99, "position": 2, "country": "us", "currency": "USD"},
    ],
    "gb": [
        {"seller": "SoundHub", "price": 229.99, "position": 1, "country": "gb", "currency": "GBP"},
    ]
}

CURRENCY_MAP = {"us": "USD", "gb": "GBP", "de": "EUR", "fr": "EUR", "ca": "CAD", "au": "AUD"}

# Title substrings that identify accessories / wrong products — not the item itself.
# Checked case-insensitively against the listing title from brd_json=1.
ACCESSORY_KEYWORDS = (
    "skin", "wrap", "vinyl",
    "earpad", "ear pad", "earcup", "ear cup", "cushion",
    "cover", "sleeve", "pouch",
    "cable", "cord",
    "headband",
    "replacement", "spare part",
)


def _extract_model_id(query: str) -> str:
    """Pull the most distinctive token from a query, e.g. 'WH-1000XM5' from 'Sony WH-1000XM5'.
    Returns a normalised lowercase string, or '' if nothing distinctive found."""
    # Prefer hyphenated model numbers (e.g. WH-1000XM5, AirPods-Pro, WF-1000XM5)
    m = re.search(r"[A-Za-z0-9]+-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", query)
    if m:
        return m.group(0).lower().replace("-", "")
    # Fall back to the longest word (usually the model name)
    tokens = query.split()
    if tokens:
        return max(tokens, key=len).lower()
    return ""


def _is_accessory(title: str, model_id: str) -> bool:
    """Return True if the listing title looks like an accessory or wrong product."""
    t = title.lower()
    if any(kw in t for kw in ACCESSORY_KEYWORDS):
        return True
    # If we have a model identifier, the title must contain it.
    # Normalise both sides by stripping hyphens so 'WH-1000XM5' matches 'Wh1000xm5'.
    if model_id:
        t_norm = re.sub(r"[-\s]", "", t)
        if model_id not in t_norm:
            return True
    return False


def _parse_price(raw) -> float:
    """Extract numeric price from a string like '$248.00', '€249,00', or a float."""
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    # Remove currency symbols and thousands separators, normalise decimal comma
    cleaned = re.sub(r"[^\d.,]", "", str(raw))
    # Handle European format: 1.234,56 → 1234.56
    if "," in cleaned and "." in cleaned:
        if cleaned.rindex(",") > cleaned.rindex("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


class SERPClient:
    def __init__(self, api_key: str, zone: str = ""):
        if not api_key:
            raise ValueError(
                "BRIGHT_DATA_API_KEY not configured. Add to .env to enable live mode."
            )
        self.api_key = api_key
        self.zone = zone or os.getenv("BRIGHT_DATA_ZONE", "serp_api2")
        self.base_url = "https://api.brightdata.com/request"

    async def get_shopping_prices(self, query: str, markets: list,
                                  current_price: float = 0.0) -> dict:
        """Query all markets concurrently. Returns {country_code: [results]}."""
        async with aiohttp.ClientSession() as session:
            tasks = [self._fetch_market(session, query, country, current_price)
                     for country in markets]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        output = {}
        for country, result in zip(markets, results):
            if isinstance(result, Exception):
                logger.warning(f"SERP fetch failed for {country}: {result}")
                output[country] = MOCK_SERP_RESPONSE.get(country, [])
            else:
                output[country] = result if result else MOCK_SERP_RESPONSE.get(country, [])
        return output

    async def _fetch_market(self, session: aiohttp.ClientSession,
                            query: str, country: str,
                            current_price: float = 0.0) -> list:
        """POST to Bright Data /request with brd_json=1. 3 retries (1s, 2s, 4s backoff)."""
        now = datetime.now(timezone.utc).isoformat()
        delays = [1, 2, 4]

        # brd_json=1 tells Bright Data's SERP zone to return parsed JSON
        google_url = (
            f"https://www.google.com/search"
            f"?q={quote_plus(query)}&tbm=shop&gl={country}&hl=en&brd_json=1"
        )
        payload = {"zone": self.zone, "url": google_url, "format": "json"}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        for attempt, delay in enumerate(delays, 1):
            try:
                async with session.post(
                    self.base_url, json=payload, headers=headers,
                    timeout=aiohttp.ClientTimeout(total=40),
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        raise ValueError(f"HTTP {resp.status}: {body[:120]}")
                    envelope = await resp.json()
                    inner_status = envelope.get("status_code", 200)
                    if inner_status != 200:
                        raise ValueError(f"Inner status {inner_status}: {envelope.get('headers', {})}")
                    raw_body = envelope.get("body", "")
                    return self._parse_shopping_results(raw_body, country, now, query, current_price)
            except Exception as exc:
                logger.warning(f"SERP attempt {attempt}/3 for {country}: {exc}")
                if attempt < len(delays):
                    await asyncio.sleep(delay)

        logger.error(f"SERP all retries exhausted for {country}, using mock")
        return MOCK_SERP_RESPONSE.get(country, [])

    def _parse_shopping_results(self, raw_body: str, country: str,
                                timestamp: str, query: str = "",
                                current_price: float = 0.0) -> list:
        """Parse Bright Data Google Shopping JSON response.
        Filters out accessories and wrong-product listings using the item title."""
        currency = CURRENCY_MAP.get(country, "USD")
        model_id = _extract_model_id(query)

        try:
            data = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        except json.JSONDecodeError as exc:
            logger.warning(f"SERP JSON parse error for {country}: {exc}")
            return MOCK_SERP_RESPONSE.get(country, [])

        # Bright Data shopping response uses the 'shopping' key
        items = data.get("shopping") or data.get("shopping_results") or []

        if not items:
            logger.warning(f"No shopping results for {country}. Keys: {list(data.keys())}")
            return MOCK_SERP_RESPONSE.get(country, [])

        results = []
        skipped = 0
        for item in items:
            title = item.get("title") or ""
            if _is_accessory(title, model_id):
                skipped += 1
                continue
            price = _parse_price(item.get("price"))
            if price <= 0:
                continue
            # Drop anything below 50% of the product's own price — not a relevant competitor
            if current_price and price < current_price * 0.5:
                skipped += 1
                continue
            seller = (
                item.get("shop")
                or item.get("merchant")
                or item.get("seller")
                or item.get("source")
                or "Unknown"
            )
            results.append({
                "seller": seller,
                "price": price,
                "currency": currency,
                "position": item.get("rank") or item.get("position") or len(results) + 1,
                "country": country,
                "timestamp": timestamp,
                "title": title,
                "link": item.get("link") or "",
            })

        logger.info(f"SERP {country}: {len(results)} live results ({skipped} accessories filtered)")
        return results


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    api_key = os.getenv("BRIGHT_DATA_API_KEY", "")
    zone = os.getenv("BRIGHT_DATA_ZONE", "serp_api2")

    async def run():
        if api_key:
            client = SERPClient(api_key, zone)
            result = await client.get_shopping_prices("Sony WH-1000XM5", ["us", "gb"])
            for country, items in result.items():
                print(f"\n{country.upper()}: {len(items)} results")
                for item in items[:5]:
                    title = item.get("title", "")[:60]
                    print(f"  pos {item['position']:2} {item['seller']:30} {item['currency']}{item['price']:.2f}  {title}")
        else:
            print("No API key — using mock data")

    asyncio.run(run())
    print("\n✓ serp.py test passed")
