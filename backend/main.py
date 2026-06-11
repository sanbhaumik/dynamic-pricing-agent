"""
PricingAgent — FastAPI backend.
Supports demo mode (no API keys) and live mode (Bright Data + Anthropic).
"""
import asyncio
import logging
import os
from typing import Optional

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from pydantic import BaseModel, Field, field_validator

from agent.demo_data import DEMO_PRODUCT, get_demo_history, get_demo_scenario
from agent.memory import PriceMemory

# Load .env from the backend directory, regardless of where uvicorn is launched from
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="PricingAgent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mode detection ────────────────────────────────────────────────────────────
BRIGHT_DATA_API_KEY = os.getenv("BRIGHT_DATA_API_KEY", "")
BRIGHT_DATA_ZONE = os.getenv("BRIGHT_DATA_ZONE", "serp_api2")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5")

APP_MODE = "live" if BRIGHT_DATA_API_KEY else "demo"

if APP_MODE == "demo":
    logger.info("Running in demo mode — add BRIGHT_DATA_API_KEY for live data")
else:
    logger.info("Running in live mode")

# ── Singletons ────────────────────────────────────────────────────────────────
memory = PriceMemory()
serp_client = None
amazon_client = None
decision_engine = None
_last_analysis: Optional[str] = None
_rotation_counter = 0
_rotation_lock = asyncio.Lock()

if APP_MODE == "live":
    try:
        from agent.serp import SERPClient
        from agent.amazon import AmazonClient
        from agent.decision import DecisionEngine

        serp_client = SERPClient(BRIGHT_DATA_API_KEY, BRIGHT_DATA_ZONE)
        amazon_client = AmazonClient(BRIGHT_DATA_API_KEY)
        if ANTHROPIC_API_KEY:
            decision_engine = DecisionEngine(ANTHROPIC_API_KEY, ANTHROPIC_MODEL, memory)
    except Exception as exc:
        logger.error(f"Failed to initialise live clients: {exc}")


# ── Request / Response models ─────────────────────────────────────────────────
class AnalyseRequest(BaseModel):
    query: str = "Sony WH-1000XM5"
    current_price: float = Field(279.00, gt=0)
    margin_floor: float = Field(195.00, ge=0)
    markets: Annotated[list[str], Field(max_length=10)] = ["us", "gb", "de", "fr"]
    asin: Optional[str] = "B09XS7JWHH"
    target_position: int = Field(2, ge=1, le=10)
    demo_mode: bool = True

    @field_validator("query")
    @classmethod
    def sanitise_query(cls, v: str) -> str:
        return v.strip().replace("\n", " ").replace("\r", " ")[:200]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/status")
async def get_status():
    return {
        "mode": APP_MODE,
        "bright_data_configured": bool(BRIGHT_DATA_API_KEY),
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "last_analysis": _last_analysis,
    }


@app.get("/products")
async def get_products():
    """Return product config from config.yaml if present, else demo product."""
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                cfg = yaml.safe_load(f)
            products = cfg.get("products", [])
            if products:
                p = products[0]
                return {
                    "query": p.get("search_query", p.get("query", "Sony WH-1000XM5")),
                    "name": p.get("name", "Sony WH-1000XM5"),
                    "sku": p.get("sku", "sony-wh1000xm5"),
                    "current_price": p.get("current_price", 279.00),
                    "margin_floor": p.get("margin_floor", 195.00),
                    "markets": p.get("markets", ["us", "gb", "de", "fr"]),
                    "asin": p.get("amazon_asin", ""),
                    "target_position": p.get("target_position", 2),
                }
        except Exception as exc:
            logger.warning(f"config.yaml parse error: {exc}")
    return DEMO_PRODUCT


@app.post("/analyse")
async def run_analysis(body: AnalyseRequest):
    global _last_analysis, _rotation_counter

    # Demo mode: return pre-baked scenario
    if body.demo_mode or APP_MODE == "demo":
        from datetime import datetime, timezone
        async with _rotation_lock:
            result = get_demo_scenario(_rotation_counter)
            _rotation_counter = (_rotation_counter + 1) % 3
            _last_analysis = datetime.now(timezone.utc).isoformat()
        return result

    # Live mode
    if not serp_client:
        raise HTTPException(status_code=503, detail="SERP client not configured")
    if not decision_engine:
        raise HTTPException(status_code=503, detail="Decision engine not configured. Add ANTHROPIC_API_KEY to .env")

    try:
        product = {
            "query": body.query,
            "sku": "custom-product",
            "current_price": body.current_price,
            "margin_floor": body.margin_floor,
            "markets": body.markets,
            "asin": body.asin,
            "target_position": body.target_position,
        }

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        # Fetch SERP + Amazon concurrently
        async def _no_amazon():
            return None

        serp_task = serp_client.get_shopping_prices(body.query, body.markets, body.current_price)
        amazon_task = (
            amazon_client.get_buy_box_data(body.asin)
            if body.asin and amazon_client
            else _no_amazon()
        )
        shopping_data, amazon_data = await asyncio.gather(serp_task, amazon_task)

        # Record competitor prices to memory
        for country, sellers in shopping_data.items():
            for s in sellers:
                memory.record_competitor_price(
                    sku=product["sku"],
                    market=country,
                    seller=s.get("seller", "Unknown"),
                    price=s.get("price", 0),
                    timestamp=s.get("timestamp", now),
                )

        # Get AI decision
        decision = await decision_engine.evaluate(product, shopping_data, amazon_data)

        _last_analysis = now
        return {
            "mode": "live",
            "scenario": None,
            "product": product,
            "decision": decision,
            "market_data": shopping_data,
            "amazon": amazon_data,
            "analysed_at": now,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Analysis error: {exc}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}")


@app.get("/decisions")
async def get_decisions(
    sku: str = Query(default="sony-wh1000xm5"),
    demo: bool = Query(default=False),
):
    if demo:
        return get_demo_history()
    return memory.get_decisions(sku)


@app.post("/decisions/{decision_id}/apply")
async def apply_decision(decision_id: str):
    found = memory.update_decision_status(decision_id, "applied")
    if not found:
        # Demo IDs (dec_hist_XXX) are not in live memory — treat as success
        pass
    return {"success": True, "decision_id": decision_id}


@app.post("/decisions/{decision_id}/dismiss")
async def dismiss_decision(decision_id: str):
    memory.update_decision_status(decision_id, "dismissed")
    return {"success": True, "decision_id": decision_id}


@app.get("/history")
async def get_history(
    sku: str = Query(default="sony-wh1000xm5"),
    market: str = Query(default="us"),
):
    return memory.get_chart_data(sku, market)
