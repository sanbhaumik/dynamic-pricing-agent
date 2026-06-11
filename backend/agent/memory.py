"""
In-memory price and decision storage. No database. Resets on restart.
Singleton pattern — import `memory` directly.
"""
from datetime import datetime, timezone, timedelta


class PriceMemory:

    def __init__(self):
        # {"{sku}:{market}:{seller}": list[dict]}
        self._prices: dict = {}
        # {sku: list[dict]}
        self._decisions: dict = {}

        # Max 48 price entries per sku:market:seller combination
        self._max_prices = 48
        # Max 50 decision entries per sku
        self._max_decisions = 50

    # ── Competitor price tracking ─────────────────────────────────────────

    def record_competitor_price(self, sku: str, market: str, seller: str,
                                price: float, timestamp: str) -> None:
        """Append price entry, trim to last 48 if over limit."""
        key = f"{sku}:{market}:{seller}"
        if key not in self._prices:
            self._prices[key] = []
        self._prices[key].append({
            "seller": seller,
            "price": price,
            "timestamp": timestamp
        })
        if len(self._prices[key]) > self._max_prices:
            self._prices[key] = self._prices[key][-self._max_prices:]

    def get_latest_per_seller(self, sku: str, market: str) -> list:
        """Returns [{seller, price, timestamp}] — most recent per seller."""
        results = []
        prefix = f"{sku}:{market}:"
        for key, entries in self._prices.items():
            if key.startswith(prefix) and entries:
                latest = entries[-1]
                results.append({
                    "seller": latest["seller"],
                    "price": latest["price"],
                    "timestamp": latest["timestamp"]
                })
        return results

    def get_7day_average(self, sku: str, market: str, seller: str) -> float | None:
        """Average price from last 168 hours. Returns None if fewer than 3 data points."""
        key = f"{sku}:{market}:{seller}"
        entries = self._prices.get(key, [])
        if not entries:
            return None

        cutoff = datetime.now(timezone.utc) - timedelta(hours=168)
        recent = []
        for e in entries:
            try:
                ts = datetime.fromisoformat(e["timestamp"])
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if ts >= cutoff:
                    recent.append(e["price"])
            except (ValueError, KeyError):
                continue

        if len(recent) < 3:
            return None
        return sum(recent) / len(recent)

    # ── Decision tracking ─────────────────────────────────────────────────

    def record_decision(self, sku: str, decision: dict) -> None:
        """Prepend to list (newest first), trim to 50."""
        if sku not in self._decisions:
            self._decisions[sku] = []

        entry = dict(decision)
        if "id" not in entry:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
            entry["id"] = f"dec_{ts}"
        if "status" not in entry:
            entry["status"] = "pending"

        self._decisions[sku].insert(0, entry)
        if len(self._decisions[sku]) > self._max_decisions:
            self._decisions[sku] = self._decisions[sku][:self._max_decisions]

    def get_decisions(self, sku: str, limit: int = 20) -> list:
        """Returns decisions newest first, up to limit."""
        return self._decisions.get(sku, [])[:limit]

    def update_decision_status(self, decision_id: str, status: str) -> bool:
        """Find decision by id across all skus, update status. Returns True if found."""
        for sku_decisions in self._decisions.values():
            for d in sku_decisions:
                if d.get("id") == decision_id:
                    d["status"] = status
                    return True
        return False

    def get_chart_data(self, sku: str, market: str = "us") -> list:
        """Returns last 24 data points [{timestamp, lowest_competitor_price}]."""
        prefix = f"{sku}:{market}:"
        all_entries: list = []

        for key, entries in self._prices.items():
            if key.startswith(prefix):
                seller = key[len(prefix):]
                if seller.lower() == "you":
                    continue
                all_entries.extend(entries)

        if not all_entries:
            return []

        # Group by timestamp bucket (minute-level) and find lowest per bucket
        buckets: dict = {}
        for e in all_entries:
            ts = e["timestamp"][:16]  # YYYY-MM-DDTHH:MM
            if ts not in buckets:
                buckets[ts] = e["price"]
            else:
                buckets[ts] = min(buckets[ts], e["price"])

        sorted_buckets = sorted(buckets.items())[-24:]
        return [
            {"timestamp": ts, "lowest_competitor_price": price}
            for ts, price in sorted_buckets
        ]


# Module-level singleton
memory = PriceMemory()


if __name__ == "__main__":
    m = PriceMemory()
    now = datetime.now(timezone.utc)

    # 1. Record 5 prices for AudioMax and 3 for SoundHub
    for i in range(5):
        ts = (now - timedelta(hours=i)).isoformat()
        m.record_competitor_price("test", "us", "AudioMax", 259.99 - i, ts)
    for i in range(3):
        ts = (now - timedelta(hours=i)).isoformat()
        m.record_competitor_price("test", "us", "SoundHub", 274.99 - i, ts)

    # 2. get_latest_per_seller returns exactly 2 entries
    latest = m.get_latest_per_seller("test", "us")
    assert len(latest) == 2, f"Expected 2 sellers, got {len(latest)}"
    print(f"✓ get_latest_per_seller: {len(latest)} entries")

    # 3. Record a decision, assert status pending
    m.record_decision("test", {
        "action": "reprice",
        "recommended_price": 264.99,
        "reasoning": "test"
    })
    decisions = m.get_decisions("test")
    assert len(decisions) == 1
    assert decisions[0]["status"] == "pending"
    print(f"✓ record_decision: status=pending")

    # 4. Update status to applied
    dec_id = decisions[0]["id"]
    result = m.update_decision_status(dec_id, "applied")
    assert result is True
    assert m.get_decisions("test")[0]["status"] == "applied"
    print(f"✓ update_decision_status: status=applied")

    # 5. 7-day average returns None for seller with only 2 data points
    m2 = PriceMemory()
    for i in range(2):
        ts = (now - timedelta(hours=i)).isoformat()
        m2.record_competitor_price("test", "us", "SparseAudio", 250.00 + i, ts)
    avg = m2.get_7day_average("test", "us", "SparseAudio")
    assert avg is None, f"Expected None for < 3 data points, got {avg}"
    print(f"✓ get_7day_average: None for 2 data points")

    print("✓ All memory tests passed")
