# PricingAgent

**Real-time competitor price monitoring + AI repricing decisions. Try it in 30 seconds — no API keys required.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Claude](https://img.shields.io/badge/Claude-AI-D97757?logo=anthropic&logoColor=white)](https://anthropic.com)
[![Bright Data](https://img.shields.io/badge/Bright%20Data-SERP%20API-FF6B35)](https://brightdata.com/products/serp-api)

---

## Try it now — no API keys needed

```bash
git clone https://github.com/sanbhaumik/dynamic-pricing-agent.git
cd dynamic-pricing-agent

# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload &

# Frontend (new terminal)
cd ../frontend && npm install && npm run dev
```

Open **http://localhost:5173**, click **Run Analysis**. You're live.

Demo mode cycles through three realistic scenarios using pre-populated Sony WH-1000XM5 pricing data. No sign-ups, no keys, no waiting.

---

## What you'll see

| Scenario | Trigger | Decision |
|----------|---------|----------|
| **Reprice** | AudioMax undercuts you by $19 in the US | Drop to $264.99 — recovers position 2, still $69 above floor |
| **Hold** | AudioMax drops 32% overnight | Flash sale detected — hold price, expect reversal in ~6 hours |
| **Escalate** | 3 unknown sellers appear with unusual activity | Confidence 38% — flag for manual review |

Each run shows you the full market breakdown: competitor positions across 🇺🇸 🇬🇧 🇩🇪 🇫🇷, Amazon Buy Box ownership, and a price history chart.

---

## Unlock live data

The demo is convincing. The real thing is better.

**[→ Get your free Bright Data API key](https://brightdata.com/products/serp-api)** — pulls live competitor prices from Google Shopping, geo-targeted across any country. No credit card required to start.

Once you have your keys:

```bash
cp backend/.env.example backend/.env
```

```env
BRIGHT_DATA_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

Restart the backend. The demo banner disappears. Enter any product. Click Run Analysis. You'll see real competitor prices from Google Shopping within seconds.

---

## How it works

```
Your product config (search query, current price, margin floor)
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Bright Data SERP API                           │
│  → Google Shopping results, any country         │
│  → Competitor names, prices, positions          │
│  brightdata.com/products/serp-api               │
└─────────────────────────────────────────────────┘
         │
┌─────────────────────────────────────────────────┐
│  Bright Data eCommerce Scraper API              │
│  → Amazon Buy Box: current owner + price        │
│  → Number of sellers competing                  │
│  brightdata.com/products/web-scraper            │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Claude (Anthropic)  — temperature=0            │
│  → Analyses all competitor data                 │
│  → Detects flash sales (>20% drops)             │
│  → Returns: action + price + confidence         │
└─────────────────────────────────────────────────┘
         │
         ▼
  REPRICE to $264.99  (confidence: 84%)
  HOLD — flash sale detected  (confidence: 91%)
  ESCALATE — unusual activity  (confidence: 38%)
```

The agent enforces hard business rules server-side — never recommends below your margin floor, never exceeds 15% above current price, always holds on flash sales regardless of what the LLM returns.

---

## Amazon Buy Box monitoring

Add your product's ASIN to track the Amazon Buy Box in real time.

PricingAgent uses the **[Bright Data eCommerce Scraper API](https://brightdata.com/products/web-scraper)** to pull Buy Box ownership, seller count, and the current lowest price — data that isn't available from standard product APIs.

```yaml
# backend/config.yaml
products:
  - name: "Sony WH-1000XM5"
    amazon_asin: "B09XS7JWHH"   # Add your ASIN here
```

When configured, the Buy Box panel shows you exactly who owns the Buy Box, whether you're competing for it, and what price it would take to win it — within your margin constraints.

---

## Configuration

```yaml
# backend/config.yaml (copy from config.yaml.example)

products:
  - name: "Sony WH-1000XM5 Wireless Headphones"
    sku: "sony-wh1000xm5"
    search_query: "Sony WH-1000XM5"   # Terms used to query Google Shopping
    current_price: 279.00             # Your current selling price
    margin_floor: 195.00              # Hard floor — Claude never goes below this
    target_position: 2                # Target rank (2 is safer than chasing 1)
    amazon_asin: "B09XS7JWHH"        # Optional — enables Buy Box panel
    markets:
      - us
      - gb
      - de
      - fr
    currency: USD
```

The `margin_floor` is enforced both in the AI prompt and in server code — two independent checks. Even if Claude returns a bad price, the server clamps it.

---

## Project structure

```
dynamic-pricing-agent/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── agent/
│   │   ├── serp.py          # Bright Data SERP API client
│   │   ├── amazon.py        # Bright Data eCommerce Scraper client
│   │   ├── decision.py      # Claude integration + rule enforcement
│   │   ├── memory.py        # In-memory price + decision storage
│   │   └── demo_data.py     # Pre-baked demo scenarios
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── DecisionPanel.jsx    # Main recommendation display
            ├── MarketPanel.jsx      # Competitor price table by country
            ├── BuyBoxPanel.jsx      # Amazon Buy Box data
            ├── PriceChart.jsx       # Price history over time
            ├── HistoryDrawer.jsx    # Past decisions sidebar
            └── ...
```

---

## What to build next

PricingAgent is intentionally minimal — a working foundation to extend.

- **Auto-reprice** — connect to the Shopify Admin API to apply recommendations automatically
- **Scheduled monitoring** — run the analysis loop every N hours without clicking
- **Multi-product dashboard** — track an entire catalogue, not just one SKU
- **Alerts** — Slack or email when action is required
- **Deploy** — Railway or Render, one-click deploy

The backend is stateless (in-memory only) and the API shape is clean — straightforward to extend.

---

## Built with

- **[Bright Data SERP API](https://brightdata.com/products/serp-api)** — geo-targeted Google Shopping data, any country
- **[Bright Data eCommerce Scraper API](https://brightdata.com/products/web-scraper)** — Amazon Buy Box data
- **[Claude](https://anthropic.com)** — pricing strategy, flash sale detection, confidence scoring
- **[FastAPI](https://fastapi.tiangolo.com)** — async Python backend
- **[React](https://react.dev)** + Recharts — frontend with dark theme

---

## License

MIT — use it, fork it, build on it.
