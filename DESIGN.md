# Design System — PricingAgent

## Product Context
- **What this is:** A competitive pricing intelligence dashboard that monitors competitor prices across Google Shopping and Amazon, then delivers AI-powered repricing decisions (reprice / hold / escalate).
- **Who it's for:** E-commerce sellers who need to act on competitor price changes within seconds, not browse weekly reports.
- **Space/industry:** Pricing intelligence / e-commerce analytics. Peers: Prisync, Wiser, Omnia Retail, Competera.
- **Project type:** Web app / decision dashboard
- **Memorable thing:** "This is serious pricing software" — Bloomberg Terminal for e-commerce pricing.

---

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian
- **Decoration level:** intentional — every decorative element encodes information (heatmap bars, confidence tracks, status pulses). Nothing is purely decorative.
- **Mood:** War room, not dashboard. Every pixel communicates that markets move in real time and hesitation costs money. The product should make users feel alert — low-grade adrenaline, not delight.
- **What to avoid:** Gradients on backgrounds or buttons. Purple glow accents. Bubbly equal-height card layouts. Centered hero sections with icon grids. Any visual pattern that signals "generic SaaS."
- **Reference contrast:** Prisync, Wiser, Omnia all use light backgrounds with blue accents and equal-weight panel grids — this product is the opposite on all three.

---

## Typography

- **Hero/Verdict:** DM Mono — used at 72–80px for the decision word (REPRICE / HOLD / ESCALATE). The verdict word is the largest typographic element on the page at all times. Letter-spacing: −0.04em. Weight: 500. This is the single most distinctive typographic decision in the product.
- **Recommended price:** DM Mono at 32–36px, weight 400, color `--text-secondary`. Sub-headline beneath the verdict word.
- **Body:** DM Sans, 14px, weight 400–500. Line-height 1.5. Used for reasoning text, labels, sidebar fields.
- **UI labels / section headers:** DM Sans, 11px, weight 600, `letter-spacing: 0.1em`, `text-transform: uppercase`, color `--text-muted`. Always uppercase. Never mixed-case for structural labels.
- **Data / prices / timestamps / ASIN:** DM Mono at 13–14px. Every number that represents money, position, or time must be in DM Mono. No exceptions.
- **Code:** DM Mono (same font, used as-is)
- **Loading:** Google Fonts CDN in `index.html`. Both fonts already loaded.

### Type Scale
| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| hero-verdict | 80px | 500 | DM Mono | REPRICE / HOLD / ESCALATE |
| hero-price | 36px | 400 | DM Mono | Recommended price beneath verdict |
| price-display | 20px | 500 | DM Mono | Market table prices, Buy Box price |
| heading | 16px | 600 | DM Sans | Panel titles (if needed) |
| body | 14px | 400 | DM Sans | Reasoning text, descriptions |
| data | 13px | 400 | DM Mono | Secondary prices, timestamps, ASINs |
| label | 11px | 600 | DM Sans | Section headers (uppercase) |
| badge | 10px | 700 | DM Sans | Badges, chips (uppercase) |

---

## Color

- **Approach:** balanced — one interactive accent (indigo), semantic colors for price direction and system states. Color is meaningful, not decorative.

```css
:root {
  /* Surfaces — warm-tinted near-black ("forged steel, not developer tool") */
  --bg-primary:     #0c0a0f;   /* deepest background */
  --bg-surface:     #141118;   /* card/panel backgrounds */
  --bg-elevated:    #1d1a26;   /* dropdowns, hover states, active elements */

  /* Structure */
  --border:         #2a2636;   /* primary borders — warm-purple not blue-gray */
  --border-subtle:  #1e1b2a;   /* row dividers, intra-panel separators */

  /* Accent */
  --accent-primary: #6366f1;   /* interactive — buttons, selection, focus rings */
  --accent-success: #00d485;   /* positive price delta, winning states — sharper terminal green */
  --accent-warning: #f59e0b;   /* flash sale detected, demo mode, hold action */
  --accent-danger:  #ef4444;   /* competitor undercutting you, escalate action */
  --accent-blue:    #3b82f6;   /* informational states only */

  /* Text */
  --text-primary:   #f1f5f9;   /* main content */
  --text-secondary: #94a3b8;   /* supporting info, sub-labels */
  --text-muted:     #475569;   /* section labels, timestamps, placeholders */
}
```

### Semantic color usage
| Color | Hex | Use for |
|-------|-----|---------|
| accent-primary | #6366f1 | REPRICE verdict, interactive elements, YOUR row highlight |
| accent-success | #00d485 | Positive delta, price above you, APPLIED status |
| accent-warning | #f59e0b | HOLD verdict, flash sale, demo mode indicator |
| accent-danger  | #ef4444 | ESCALATE verdict, competitor below you, Buy Box loss |

---

## Spacing
- **Base unit:** 8px
- **Density:** comfortable — tighter than Notion, looser than Bloomberg Terminal
- **Scale:** 2(2px) · 4(4px) · 8(8px) · 12(12px) · 16(16px) · 20(20px) · 24(24px) · 32(32px) · 48(48px) · 64(64px)
- **Standard panel padding:** 20px
- **Row padding (tables):** 9px vertical, 12px horizontal, 16px left (to accommodate the heatmap bar)
- **Header height:** 56px
- **Sidebar width:** 272px

---

## Layout

- **Approach:** grid-disciplined with one deliberate override — the verdict hero is full-width and unconstrained.
- **Grid:** 2-column main content grid after the sidebar. DecisionPanel spans full width (top). MarketPanel and BuyBoxPanel side by side. PriceChart spans full width (bottom).
- **Max content width:** none (fills available width after sidebar)
- **Border radius:** 8px panels, 6px buttons/inputs, 4px badges, 3px inline tags. No uniform bubbly radius.
- **Sidebar:** fixed-position left sidebar, 272px wide, `top: 56px` (below header).

### Layout hierarchy (post-analysis state)
```
[Header — 56px]
[Sidebar 272px | DecisionPanel — FULL WIDTH — verdict hero]
               [MarketPanel  |  BuyBoxPanel]
               [PriceChart   — FULL WIDTH]
[StatusBar]
```

---

## The Two Risks — Signature Design Choices

These are deliberate departures from how every other pricing SaaS looks. Do not revert them without explicit discussion.

### Risk 1: Verdict as Monument
The decision action word (REPRICE / HOLD / ESCALATE) renders at 80px DM Mono as the dominant focal point of the screen. No card border. No surrounding box. Just the word, then the recommended price below it at 36px. When a new analysis completes, the word crossfades in at 200ms ease — it arrives like a verdict.

- **What you gain:** Instant read. The user knows the decision before reading anything else. Memorable first impression.
- **Color:** REPRICE = `--accent-primary`, HOLD = `--accent-warning`, ESCALATE = `--accent-danger`
- **Never:** put the verdict word inside a card, add a drop shadow to it, or animate it with bounce/slide.

### Risk 2: Heatmap Competitor Table
Every competitor row has a 4px left-edge color bar whose color and opacity encode competitive threat level. The bar is not labeled — users learn it in 15 seconds.

| Scenario | Bar color | Opacity |
|----------|-----------|---------|
| Competitor significantly below you | `--accent-danger` | 0.9 |
| Competitor slightly below you | `--accent-danger` | 0.4 |
| Your own row | `--accent-primary` | 0.6 |
| Competitor slightly above you | `--accent-success` | 0.5 |
| Competitor well above you | `--text-muted` | 0.3 |

The bar is `position: absolute; left: 0; top: 0; bottom: 0; width: 4px`. The row's left padding must be 16px to not overlap text.

---

## Motion
- **Approach:** minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50–100ms) · short(150–250ms) · medium(250–400ms)
- **The one meaningful moment:** verdict word crossfade on new analysis — `opacity 0.2s ease`
- **What to avoid:** entrance animations on data rows, bounce/spring on state changes, decorative scroll-triggered animations

---

## Conversion Touchpoints — Do Not Remove
These are the point of the project. Their presence is a design constraint.

1. **DemoBanner** — amber strip at the very top in demo mode. "Monitor your own products →" links to Bright Data SERP API.
2. **Amazon upgrade prompt** — in BuyBoxPanel when no ASIN configured. Links to Bright Data eCommerce Scraper.
3. **StatusBar** — "Powered by Bright Data + Claude" with links, always visible.

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-09 | Verdict-as-monument layout | REPRICE/HOLD/ESCALATE at 80px DM Mono. Dominant focal point, uncarded. No pricing SaaS does this. Serves the 10-second decision window. |
| 2026-06-09 | Heatmap competitor rows | 4px left-edge color bars encoding threat level. Communicates competitive landscape shape before reading numbers. |
| 2026-06-09 | Warm surface palette | #0c0a0f base (was #0a0a0f). 2° warmth on all surfaces — "forged steel" not "developer tool." |
| 2026-06-09 | Success green sharpened | #00d485 (was #10b981). Positive price deltas read as signal, not generic success state. |
| 2026-06-09 | DM Sans + DM Mono retained | Subagent proposed Space Grotesk. Rejected — overused convergence font. DM pairing is established, consistent, already loaded. |
| 2026-06-09 | Design system created | /design-consultation — Industrial/Utilitarian direction. Bloomberg for e-commerce. |
