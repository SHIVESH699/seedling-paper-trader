"""
Finnhub provider for free near-real-time US stock quotes (NYSE / NASDAQ).
Free tier: 60 API calls/minute. Does not include free historical candles,
so charts remain handled by YahooFinanceProvider.
"""

from datetime import datetime, timezone
from typing import Optional
import httpx

from market_hours import get_market_status
from providers.base import Candle, Fundamentals, MarketDataProvider, Quote, SearchResult


class FinnhubProvider(MarketDataProvider):
    name = "finnhub"
    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self._client = httpx.Client(timeout=6.0)

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def get_quote(self, symbol: str, known_name: str = "", known_exchange: str = "US") -> Optional[Quote]:
        if not self.enabled:
            return None

        finnhub_symbol = symbol.replace("-", ".")
        try:
            resp = self._client.get(
                f"{self.BASE_URL}/quote",
                params={"symbol": finnhub_symbol, "token": self.api_key},
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
        except httpx.HTTPError:
            return None

        price = data.get("c")
        prev_close = data.get("pc")
        if not price or price <= 0:
            return None

        price = float(price)
        prev_close = float(prev_close) if prev_close and prev_close > 0 else price
        day_change = price - prev_close
        day_change_pct = (day_change / prev_close) * 100.0 if prev_close else 0.0

        us_status = get_market_status("US")
        is_open = us_status["is_open"]

        return Quote(
            symbol=symbol.upper(),
            name=known_name or symbol.upper(),
            market="US",
            exchange=known_exchange or "NYSE/NASDAQ",
            currency="USD",
            price=round(price, 2),
            previous_close=round(prev_close, 2),
            day_change=round(day_change, 2),
            day_change_pct=round(day_change_pct, 2),
            day_high=round(float(data["h"]), 2) if data.get("h") else None,
            day_low=round(float(data["l"]), 2) if data.get("l") else None,
            is_delayed=False,
            delay_label="Live" if is_open else "Market Closed",
            data_source="finnhub",
            as_of=datetime.now(timezone.utc).isoformat(),
        )

    def get_us_fundamentals_fallback(self, symbol: str) -> Optional[dict]:
        """Fetch US company profile + P/E/52W metrics from Finnhub if Yahoo quoteSummary is throttled."""
        if not self.enabled:
            return None
        fh_sym = symbol.replace("-", ".")
        try:
            prof_resp = self._client.get(
                f"{self.BASE_URL}/stock/profile2",
                params={"symbol": fh_sym, "token": self.api_key},
            )
            met_resp = self._client.get(
                f"{self.BASE_URL}/stock/metric",
                params={"symbol": fh_sym, "metric": "all", "token": self.api_key},
            )
            profile = prof_resp.json() if prof_resp.status_code == 200 else {}
            metric = (met_resp.json() if met_resp.status_code == 200 else {}).get("metric", {})
            if not profile and not metric:
                return None
            mcap_millions = profile.get("marketCapitalization")
            return {
                "name": profile.get("name"),
                "sector": profile.get("finnhubIndustry"),
                "market_cap": float(mcap_millions) * 1_000_000 if mcap_millions else None,
                "pe_ratio": metric.get("peBasicExclExtraTTM") or metric.get("peTTM"),
                "week_52_high": metric.get("52WeekHigh"),
                "week_52_low": metric.get("52WeekLow"),
            }
        except Exception:
            return None

    def get_candles(self, symbol: str, range_key: str) -> list[Candle]:
        return []

    def get_candles_since(self, symbol: str, start_utc: datetime) -> list[Candle]:
        return []

    def get_fundamentals(self, symbol: str) -> Optional[Fundamentals]:
        return None

    def search(self, query: str) -> list[SearchResult]:
        return []
