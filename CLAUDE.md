# CLAUDE.md — PricingAgent Project

This file is your persistent memory for this project. Read it at the start of every session. Follow every instruction here without being asked.

---

## What We're Building

A local web application called **PricingAgent**. FastAPI backend + React frontend. Two modes:

- **Demo mode** — works with zero API keys. Pre-populated Sony WH-1000XM5 data. Fully interactive.
- **Live mode** — unlocked when `BRIGHT_DATA_API_KEY` is present in `.env`. Hits real APIs.

**Primary goal:** Drive Bright Data SERP API and eCommerce Scraper API signups. Every design decision serves this goal.

---

## Project Structure

```
pricing-agent/
├── CLAUDE.md                    ← you are here
├── backend/
│   ├── main.py
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── serp.py
│   │   ├── amazon.py
│   │   ├── decision.py
│   │   ├── memory.py
│   │   └── demo_data.py
│   ├── config.yaml.example
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── DemoBanner.jsx
    │       ├── Header.jsx
    │       ├── ProductConfig.jsx
    │       ├── MarketPanel.jsx
    │       ├── BuyBoxPanel.jsx
    │       ├── DecisionPanel.jsx
    │       ├── HistoryDrawer.jsx
    │       ├── PriceChart.jsx
    │       └── StatusBar.jsx
    ├── package.json
    └── index.html
```

---

## Non-Negotiable Rules

Read these before writing any code. Never violate them.

### Backend rules
1. **Never use a database.** Memory only. `memory.py` uses Python dicts. Resets on restart. No SQLite, no files, no Redis.
2. **Never raise exceptions from agent modules.** `serp.py` and `amazon.py` return empty list / None on failure. The analysis cycle never crashes — it degrades gracefully.
3. **Demo mode is controlled by the request body**, not by whether API keys exist. `POST /analyse` accepts `demo_mode: bool`. This allows the frontend to always show demo data when toggled, even if live keys are present.
4. **CORS must always be enabled** for `http://localhost:5173`. Never remove this.
5. **temperature=0 always** for Claude calls. Pricing decisions must be deterministic.
6. **Never modify the decision system prompt.** It is defined in `decision.py` and must not be changed.

### Frontend rules
1. **Never use Inter, Roboto, Arial, or system fonts.** Fonts are `DM Sans` (body) and `DM Mono` (prices, headings, badges). Load via Google Fonts in `index.html`.
2. **Never use purple gradients or light backgrounds.** Dark theme only. Background is `#0a0a0f`.
3. **All prices must render in `DM Mono`.** Always. Even in inputs.
4. **Country flags are emoji only.** `{us: "🇺🇸", gb: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", ca: "🇨🇦", au: "🇦🇺"}`. No flag libraries.
5. **The demo banner is always the first thing rendered** when in demo mode. Never hide it.
6. **Tailwind is loaded via CDN.** Do not install it as a package.
7. **Never use `localStorage` or `sessionStorage`.** All state lives in React state only.

### General rules
1. **One module at a time.** Complete and test each module before moving to the next.
2. **Run the test specified in CLAUDE.md for each phase** before declaring it done.
3. **If something is ambiguous, ask.** Never guess on API shapes, component props, or business logic.
4. **If a Bright Data API call fails during development**, return the mock data defined in this file. Never block progress on API availability.
5. **Keep the conversion touchpoints intact.** Never remove the demo banner, the Amazon upgrade prompt, or the Bright Data links. They are the point of the project.

---

## Colour Palette

Use these CSS variables everywhere. Define them in a global CSS file imported by `App.jsx`.

```css
:root {
  --bg-primary:     #0a0a0f;
  --bg-surface:     #12121a;
  --bg-elevated:    #1a1a26;
  --border:         #2a2a3a;
  --accent-primary: #6366f1;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger:  #ef4444;
  --accent-blue:    #3b82f6;
  --text-primary:   #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted:     #475569;
}
```

---

## API Shapes

### POST /analyse — request
```json
{
  "query": "Sony WH-1000XM5",
  "current_price": 279.00,
  "margin_floor": 195.00,
  "markets": ["us", "gb", "de", "fr"],
  "asin": "B09XS7JWHH",
  "target_position": 2,
  "demo_mode": true
}
```

### POST /analyse — response
```json
{
  "mode": "demo",
  "scenario": 1,
  "product": {
    "query": "Sony WH-1000XM5",
    "current_price": 279.00,
    "margin_floor": 195.00,
    "markets": ["us", "gb", "de", "fr"]
  },
  "decision": {
    "action": "reprice",
    "recommended_price": 264.99,
    "confidence": 84,
    "reasoning": "AudioMax dropped $19 in US. $264.99 recovers position 2, $69.99 above floor.",
    "flash_sale_detected": false,
    "market_snapshot": {
      "lowest_competitor_price": 259.99,
      "your_position": 4,
      "markets_analysed": 4
    }
  },
  "market_data": {
    "us": [
      {"seller": "AudioMax", "price": 259.99, "position": 1, "country": "us"},
      {"seller": "SoundHub", "price": 274.99, "position": 2, "country": "us"},
      {"seller": "You", "price": 279.00, "position": 4, "country": "us", "is_you": true},
      {"seller": "TechDeals", "price": 284.99, "position": 5, "country": "us"}
    ],
    "gb": [
      {"seller": "SoundHub", "price": 229.99, "position": 1, "country": "gb"},
      {"seller": "You", "price": 249.00, "position": 2, "country": "gb", "is_you": true}
    ],
    "de": [
      {"seller": "KlangWelt", "price": 249.00, "position": 1, "country": "de"},
      {"seller": "You", "price": 279.00, "position": 3, "country": "de", "is_you": true},
      {"seller": "AudioMax", "price": 289.00, "position": 5, "country": "de"}
    ],
    "fr": [
      {"seller": "You", "price": 279.00, "position": 1, "country": "fr", "is_you": true}
    ]
  },
  "amazon": {
    "buy_box_price": 259.99,
    "buy_box_winner": "AudioMax",
    "seller_count": 8,
    "lowest_price": 254.99
  },
  "analysed_at": "2026-01-15T14:32:00Z"
}
```

### GET /status — response
```json
{
  "mode": "demo",
  "bright_data_configured": false,
  "anthropic_configured": false,
  "last_analysis": null
}
```

### GET /decisions — response
```json
[
  {
    "id": "dec_001",
    "sku": "sony-wh1000xm5",
    "action": "reprice",
    "current_price": 279.00,
    "recommended_price": 264.99,
    "confidence": 84,
    "reasoning": "AudioMax dropped $19 in US. $264.99 recovers position 2.",
    "flash_sale_detected": false,
    "status": "pending",
    "timestamp": "2026-01-15T14:32:00Z"
  }
]
```

---

## Demo Scenarios

### Scenario 1 — REPRICE (default, shown on first load)
Action: reprice | Recommended: $264.99 | Confidence: 84 | Flash sale: false
Trigger: AudioMax undercuts by $19 in US market

### Scenario 2 — HOLD / Flash sale detected
Action: hold | Recommended: $279.00 | Confidence: 91 | Flash sale: true
Trigger: AudioMax drops 32% — flash sale pattern detected

### Scenario 3 — ESCALATE
Action: escalate | Recommended: $279.00 | Confidence: 38 | Flash sale: false
Trigger: Unusual seller activity, Buy Box changed 4 times in 24h

Rotation: 1 → 2 → 3 → 1 → ... on each "Run Analysis" click.

---

## Mock Data for Development

If Bright Data APIs are unavailable, use this mock. Never block development on API availability.

```python
MOCK_SERP_RESPONSE = {
    "us": [
        {"seller": "AudioMax", "price": 259.99, "position": 1, "country": "us", "currency": "USD"},
        {"seller": "SoundHub", "price": 274.99, "position": 2, "country": "us", "currency": "USD"},
    ],
    "gb": [
        {"seller": "SoundHub", "price": 229.99, "position": 1, "country": "gb", "currency": "GBP"},
    ]
}

MOCK_AMAZON_RESPONSE = {
    "asin": "B09XS7JWHH",
    "buy_box_price": 259.99,
    "buy_box_winner": "AudioMax",
    "seller_count": 8,
    "lowest_price": 254.99
}
```

---

## Conversion Touchpoints — Never Remove These

1. **DemoBanner** — `"🎭 Demo Mode — You're viewing sample data"` + `"Monitor your own products →"` button → `https://brightdata.com/products/serp-api`
2. **Amazon upgrade prompt** — shown in BuyBoxPanel when no ASIN configured → `https://brightdata.com/products/web-scraper`
3. **StatusBar** — `"Powered by Bright Data + Claude"` with links
4. **README hero** — `"Get your free Bright Data API key →"` as first CTA

---

## Decision System Prompt — Do Not Modify

```
You are a pricing strategist for an e-commerce brand.
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
}
```

---

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key non-negotiables from DESIGN.md:
- Verdict word (REPRICE/HOLD/ESCALATE) renders at 72-80px DM Mono — the dominant focal point. Never card it or box it.
- All prices, numbers, timestamps, ASINs render in DM Mono. No exceptions.
- Warm surface palette: `--bg-primary: #0c0a0f`, `--bg-surface: #141118`, `--bg-elevated: #1d1a26`
- Success green is `#00d485` (not #10b981) — sharper signal
- Competitor rows use 4px left-edge heatmap bars (see DESIGN.md Risk 2)
- Section labels are always 11px, uppercase, letter-spaced, in `--text-muted`

---

## Phase Completion Checklist

Before moving to the next phase, confirm:

- [ ] Phase 1: Both folders exist, `pip install` works, `npm install` works, server starts
- [ ] Phase 2: Demo scenarios return correct shape, history returns 5 entries
- [ ] Phase 3: Memory record + retrieve works, decisions return newest first
- [ ] Phase 4: SERP query returns results or mock, Amazon returns buy box or None
- [ ] Phase 5: Decision engine returns valid JSON matching the spec shape
- [ ] Phase 6: All 5 routes return correct responses, CORS works
- [ ] Phase 7: App loads at localhost:5173, getStatus() returns, no console errors
- [ ] Phase 8: All panels render with demo data, no prop errors
- [ ] Phase 9: Run Analysis cycles scenarios, Apply animates, History Drawer opens
- [ ] Phase 10: Live mode works end-to-end with real API keys
