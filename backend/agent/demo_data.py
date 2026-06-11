"""
Demo data module for PricingAgent.
Provides pre-baked scenarios for demo mode — no API calls required.
All data is realistic but fictional.
"""
from datetime import datetime, timezone, timedelta
import copy


DEMO_PRODUCT = {
    "query": "Sony WH-1000XM5",
    "name": "Sony WH-1000XM5 Wireless Headphones",
    "sku": "sony-wh1000xm5",
    "current_price": 279.00,
    "margin_floor": 195.00,
    "markets": ["us", "gb", "de", "fr"],
    "asin": "B09XS7JWHH",
    "target_position": 2,
    "currency": "USD"
}


def _now_minus(hours: int) -> str:
    """Return ISO timestamp N hours ago."""
    dt = datetime.now(timezone.utc) - timedelta(hours=hours)
    return dt.isoformat()


SCENARIO_1 = {
    "mode": "demo",
    "scenario": 1,
    "product": DEMO_PRODUCT,
    "decision": {
        "action": "reprice",
        "recommended_price": 264.99,
        "confidence": 84,
        "reasoning": "AudioMax dropped $19 in US. $264.99 recovers position 2, $69.99 above floor.",
        "flash_sale_detected": False,
        "market_snapshot": {
            "lowest_competitor_price": 259.99,
            "your_position": 4,
            "markets_analysed": 4
        }
    },
    "market_data": {
        "us": [
            {"seller": "AudioMax",  "price": 259.99, "position": 1, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "SoundHub",  "price": 274.99, "position": 2, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "You",       "price": 279.00, "position": 4, "country": "us", "currency": "USD", "is_you": True},
            {"seller": "TechDeals", "price": 284.99, "position": 5, "country": "us", "currency": "USD", "is_you": False},
        ],
        "gb": [
            {"seller": "SoundHub", "price": 229.99, "position": 1, "country": "gb", "currency": "GBP", "is_you": False},
            {"seller": "You",      "price": 249.00, "position": 2, "country": "gb", "currency": "GBP", "is_you": True},
            {"seller": "HiFiPlus", "price": 259.00, "position": 3, "country": "gb", "currency": "GBP", "is_you": False},
        ],
        "de": [
            {"seller": "KlangWelt", "price": 249.00, "position": 1, "country": "de", "currency": "EUR", "is_you": False},
            {"seller": "AudioMax",  "price": 265.00, "position": 2, "country": "de", "currency": "EUR", "is_you": False},
            {"seller": "You",       "price": 279.00, "position": 3, "country": "de", "currency": "EUR", "is_you": True},
        ],
        "fr": [
            {"seller": "You",       "price": 279.00, "position": 1, "country": "fr", "currency": "EUR", "is_you": True},
            {"seller": "SonElec",   "price": 285.00, "position": 2, "country": "fr", "currency": "EUR", "is_you": False},
            {"seller": "TechParis", "price": 289.99, "position": 3, "country": "fr", "currency": "EUR", "is_you": False},
        ]
    },
    "amazon": {
        "buy_box_price": 259.99,
        "buy_box_winner": "AudioMax",
        "seller_count": 8,
        "lowest_price": 254.99
    },
    "analysed_at": None
}


SCENARIO_2 = {
    "mode": "demo",
    "scenario": 2,
    "product": DEMO_PRODUCT,
    "decision": {
        "action": "hold",
        "recommended_price": 279.00,
        "confidence": 91,
        "reasoning": "AudioMax dropped 32% — flash sale pattern. Hold price. Expect reversal within 6h.",
        "flash_sale_detected": True,
        "market_snapshot": {
            "lowest_competitor_price": 189.99,
            "your_position": 3,
            "markets_analysed": 4
        }
    },
    "market_data": {
        "us": [
            {"seller": "AudioMax", "price": 189.99, "position": 1, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "SoundHub", "price": 269.99, "position": 2, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "You",      "price": 279.00, "position": 3, "country": "us", "currency": "USD", "is_you": True},
        ],
        "gb": [
            {"seller": "SoundHub", "price": 229.99, "position": 1, "country": "gb", "currency": "GBP", "is_you": False},
            {"seller": "You",      "price": 249.00, "position": 2, "country": "gb", "currency": "GBP", "is_you": True},
        ],
        "de": [
            {"seller": "KlangWelt", "price": 249.00, "position": 1, "country": "de", "currency": "EUR", "is_you": False},
            {"seller": "You",       "price": 279.00, "position": 2, "country": "de", "currency": "EUR", "is_you": True},
        ],
        "fr": [
            {"seller": "You",     "price": 279.00, "position": 1, "country": "fr", "currency": "EUR", "is_you": True},
            {"seller": "SonElec", "price": 285.00, "position": 2, "country": "fr", "currency": "EUR", "is_you": False},
        ]
    },
    "amazon": {
        "buy_box_price": 189.99,
        "buy_box_winner": "AudioMax",
        "seller_count": 11,
        "lowest_price": 184.99
    },
    "analysed_at": None
}


SCENARIO_3 = {
    "mode": "demo",
    "scenario": 3,
    "product": DEMO_PRODUCT,
    "decision": {
        "action": "escalate",
        "recommended_price": 279.00,
        "confidence": 38,
        "reasoning": "Unusual seller activity. Buy Box changed 4x in 24h. Manual review recommended.",
        "flash_sale_detected": False,
        "market_snapshot": {
            "lowest_competitor_price": 249.99,
            "your_position": 2,
            "markets_analysed": 4
        }
    },
    "market_data": {
        "us": [
            {"seller": "UnknownSeller1", "price": 249.99, "position": 1, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "You",            "price": 279.00, "position": 2, "country": "us", "currency": "USD", "is_you": True},
            {"seller": "UnknownSeller2", "price": 269.00, "position": 3, "country": "us", "currency": "USD", "is_you": False},
            {"seller": "UnknownSeller3", "price": 271.50, "position": 4, "country": "us", "currency": "USD", "is_you": False},
        ],
        "gb": [
            {"seller": "You",      "price": 249.00, "position": 1, "country": "gb", "currency": "GBP", "is_you": True},
            {"seller": "SoundHub", "price": 255.00, "position": 2, "country": "gb", "currency": "GBP", "is_you": False},
        ],
        "de": [
            {"seller": "You",       "price": 279.00, "position": 1, "country": "de", "currency": "EUR", "is_you": True},
            {"seller": "KlangWelt", "price": 282.00, "position": 2, "country": "de", "currency": "EUR", "is_you": False},
        ],
        "fr": [
            {"seller": "You",     "price": 279.00, "position": 1, "country": "fr", "currency": "EUR", "is_you": True},
            {"seller": "SonElec", "price": 285.00, "position": 2, "country": "fr", "currency": "EUR", "is_you": False},
        ]
    },
    "amazon": {
        "buy_box_price": 249.99,
        "buy_box_winner": "UnknownSeller1",
        "seller_count": 14,
        "lowest_price": 244.99
    },
    "analysed_at": None
}


SCENARIOS = [SCENARIO_1, SCENARIO_2, SCENARIO_3]


def get_demo_scenario(rotation: int) -> dict:
    """Return scenario based on rotation counter. Cycles 0->1->2->0."""
    scenario = copy.deepcopy(SCENARIOS[rotation % 3])
    scenario["analysed_at"] = _now_minus(0)
    return scenario


def get_demo_history() -> list:
    """Return 5 pre-baked historical decisions spread over the last 48 hours."""
    return [
        {
            "id": "dec_hist_001",
            "sku": "sony-wh1000xm5",
            "action": "reprice",
            "current_price": 279.00,
            "recommended_price": 264.99,
            "confidence": 84,
            "reasoning": "AudioMax dropped $19 in US. Repositioned to $264.99.",
            "flash_sale_detected": False,
            "status": "applied",
            "timestamp": _now_minus(2)
        },
        {
            "id": "dec_hist_002",
            "sku": "sony-wh1000xm5",
            "action": "hold",
            "current_price": 279.00,
            "recommended_price": 279.00,
            "confidence": 91,
            "reasoning": "Flash sale detected. AudioMax -32%. Held price — reversed after 4h.",
            "flash_sale_detected": True,
            "status": "applied",
            "timestamp": _now_minus(8)
        },
        {
            "id": "dec_hist_003",
            "sku": "sony-wh1000xm5",
            "action": "reprice",
            "current_price": 279.00,
            "recommended_price": 271.99,
            "confidence": 76,
            "reasoning": "SoundHub at $269.99. Modest reduction maintains position 2.",
            "flash_sale_detected": False,
            "status": "pending",
            "timestamp": _now_minus(18)
        },
        {
            "id": "dec_hist_004",
            "sku": "sony-wh1000xm5",
            "action": "hold",
            "current_price": 279.00,
            "recommended_price": 279.00,
            "confidence": 88,
            "reasoning": "All markets stable. Position 2 holding. No action needed.",
            "flash_sale_detected": False,
            "status": "applied",
            "timestamp": _now_minus(26)
        },
        {
            "id": "dec_hist_005",
            "sku": "sony-wh1000xm5",
            "action": "escalate",
            "current_price": 279.00,
            "recommended_price": 279.00,
            "confidence": 35,
            "reasoning": "3 unknown sellers in US market. Unusual pattern. Manual review.",
            "flash_sale_detected": False,
            "status": "dismissed",
            "timestamp": _now_minus(44)
        }
    ]


if __name__ == "__main__":
    s1 = get_demo_scenario(0)
    s2 = get_demo_scenario(1)
    s3 = get_demo_scenario(2)
    assert s1["decision"]["action"] == "reprice", f"Expected reprice, got {s1['decision']['action']}"
    assert s2["decision"]["action"] == "hold",    f"Expected hold, got {s2['decision']['action']}"
    assert s3["decision"]["action"] == "escalate", f"Expected escalate, got {s3['decision']['action']}"
    history = get_demo_history()
    assert len(history) == 5, f"Expected 5 history items, got {len(history)}"
    statuses = [h["status"] for h in history]
    assert "applied" in statuses
    assert "pending" in statuses
    assert "dismissed" in statuses
    print("✓ All demo_data tests passed")
