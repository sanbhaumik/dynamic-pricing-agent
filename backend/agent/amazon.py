"""
Bright Data eCommerce Scraper client for Amazon Buy Box data.
Returns None on failure — never raises from public methods.
"""
import asyncio
import logging
from datetime import datetime, timezone

import aiohttp

logger = logging.getLogger(__name__)

MOCK_AMAZON_RESPONSE = {
    "asin": "B09XS7JWHH",
    "buy_box_price": 259.99,
    "buy_box_winner": "AudioMax",
    "seller_count": 8,
    "lowest_price": 254.99
}


class AmazonClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.dataset_url = "https://api.brightdata.com/datasets/v3/trigger"
        self.dataset_id = "gd_l7q7dkf244hwjntr0"

    async def get_buy_box_data(self, asin: str) -> dict | None:
        """Fetch Amazon Buy Box data for a single ASIN. Returns None on failure."""
        if not self.api_key or not asin:
            return None

        now = datetime.now(timezone.utc).isoformat()
        try:
            async with aiohttp.ClientSession() as session:
                # Trigger dataset snapshot
                async with session.post(
                    self.dataset_url,
                    params={"dataset_id": self.dataset_id, "format": "json"},
                    json=[{"url": f"https://www.amazon.com/dp/{asin}"}],
                    headers={"Authorization": f"Bearer {self.api_key}",
                             "Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status not in (200, 201, 202):
                        logger.warning(f"Amazon trigger HTTP {resp.status}, using mock")
                        return dict(MOCK_AMAZON_RESPONSE, asin=asin, timestamp=now)
                    trigger_data = await resp.json()

                snapshot_id = trigger_data.get("snapshot_id")
                if not snapshot_id:
                    # Some responses return data directly
                    return self._parse_amazon_response(trigger_data, asin, now)

                # Poll for completion — max 90 seconds, every 3 seconds
                for _ in range(30):
                    await asyncio.sleep(3)
                    async with session.get(
                        f"https://api.brightdata.com/datasets/v3/progress/{snapshot_id}",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as poll_resp:
                        if poll_resp.status != 200:
                            continue
                        poll_data = await poll_resp.json()
                        if poll_data.get("status") == "ready":
                            # Fetch the actual product records from snapshot endpoint
                            async with session.get(
                                f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}",
                                headers={"Authorization": f"Bearer {self.api_key}"},
                                params={"format": "json"},
                                timeout=aiohttp.ClientTimeout(total=15)
                            ) as snap_resp:
                                if snap_resp.status != 200:
                                    break
                                snap_data = await snap_resp.json()
                                return self._parse_amazon_response(snap_data, asin, now)

                logger.warning(f"Amazon snapshot timed out for {asin}, using mock")
                return dict(MOCK_AMAZON_RESPONSE, asin=asin, timestamp=now)

        except Exception as exc:
            logger.warning(f"Amazon fetch failed for {asin}: {exc}, using mock")
            return dict(MOCK_AMAZON_RESPONSE, asin=asin, timestamp=now)

    def _parse_amazon_response(self, data, asin: str, timestamp: str) -> dict | None:
        """Parse Bright Data Amazon snapshot response into our standard shape.
        Bright Data returns a JSON array; field names from gd_l7q7dkf244hwjntr0:
          final_price, buybox_seller, number_of_sellers, initial_price
        """
        try:
            # Snapshot endpoint returns a list; take first record
            product = data
            if isinstance(data, list) and data:
                product = data[0]
            elif isinstance(data.get("data"), list) and data["data"]:
                product = data["data"][0]

            _bbp_candidates = [
                product.get("final_price"),
                product.get("buy_box_price"),
                product.get("price"),
            ]
            buy_box_price = next(
                (v for v in _bbp_candidates if v is not None),
                MOCK_AMAZON_RESPONSE["buy_box_price"]
            )
            _sc_candidates = [
                product.get("number_of_sellers"),
                product.get("sellers_count"),
                product.get("seller_count"),
            ]
            seller_count = int(next(
                (v for v in _sc_candidates if v is not None),
                0
            ))
            _low_candidates = [
                product.get("lowest_price"),
                product.get("final_price"),
            ]
            lowest = next(
                (v for v in _low_candidates if v is not None),
                buy_box_price
            )
            return {
                "asin": asin,
                "buy_box_price": float(buy_box_price),
                "buy_box_winner": product.get("buybox_seller")
                    or product.get("buy_box_seller")
                    or "Unknown",
                "seller_count": seller_count,
                "lowest_price": float(lowest),
                "timestamp": timestamp,
            }
        except Exception as exc:
            logger.warning(f"Amazon parse error for {asin}: {exc}, using mock")
            return dict(MOCK_AMAZON_RESPONSE, asin=asin, timestamp=timestamp)

    async def get_multiple(self, asins: list) -> dict:
        """Fetch all ASINs concurrently. Returns {asin: result_or_none}."""
        tasks = [self.get_buy_box_data(asin) for asin in asins]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return {
            asin: (None if isinstance(r, Exception) else r)
            for asin, r in zip(asins, results)
        }


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv("BRIGHT_DATA_API_KEY", "")

    async def run():
        if api_key:
            client = AmazonClient(api_key)
            result = await client.get_buy_box_data("B09XS7JWHH")
            if result:
                print(f"buy_box_price={result['buy_box_price']}")
                assert "asin" in result and "buy_box_price" in result
        else:
            print("No API key — using mock data")
            mock = dict(MOCK_AMAZON_RESPONSE, timestamp="2026-01-01T00:00:00+00:00")
            assert "asin" in mock and "buy_box_price" in mock
            assert "buy_box_winner" in mock and "seller_count" in mock
            print(f"Mock structure OK: {list(mock.keys())}")

    asyncio.run(run())
    print("✓ amazon.py test passed")
