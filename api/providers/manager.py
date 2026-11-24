"""
MarketDataManager routes requests across providers with smart TTL caching:
- US Quotes: Finnhub (Live) if FINNHUB_API_KEY is configured, else Yahoo Finance (Delayed).
- India Quotes: Yahoo Finance (Delayed ~15m).
- Charts, Backfill, Fundamentals, FX, Benchmarks: Yahoo Finance (+ Finnhub US fundamentals fallback).
- Fast Hybrid Search: Local popular_stocks.json + Yahoo Finance Search API.
"""

import json
from datetime import datetime
from typing import Optional

from config import API_DIR, settings
from market_hours import infer_market
from providers.base import Candle, Fundamentals, Quote, SearchResult
from providers.cache import TTLCache
from providers.finnhub_provider import FinnhubProvider
from providers.yahoo_provider import YahooFinanceProvider


class MarketDataManager:
    def __init__(self) -> None:
        self.cache = TTLCache()
        self.finnhub = FinnhubProvider(settings.FINNHUB_API_KEY)
        self.yahoo = YahooFinanceProvider()
        self.popular_stocks = self._load_popular_stocks()
        self._popular_map = {item.symbol.upper(): item for item in self.popular_stocks}

    def _load_popular_stocks(self) -> list[SearchResult]:
        path = API_DIR / "data" / "popular_stocks.json"
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        return [SearchResult(**item) for item in raw]

    def get_popular(self, market: Optional[str] = None) -> list[SearchResult]:
        if market and market.upper() in ("IN", "US"):
            return [s for s in self.popular_stocks if s.market == market.upper()]
        return self.popular_stocks

    def search(self, query: str, market: Optional[str] = None) -> list[SearchResult]:
        q = query.strip()
        if not q:
            return self.get_popular(market)[:16]

        cache_key = f"search:{q.lower()}:{market or 'ALL'}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        q_lower = q.lower()
        local_matches = [
            s for s in self.popular_stocks
            if q_lower in s.symbol.lower() or q_lower in s.name.lower() or (s.sector and q_lower in s.sector.lower())
        ]
        remote_matches = self.yahoo.search(q)

        merged: list[SearchResult] = []
        seen: set[str] = set()
        for item in local_matches + remote_matches:
            sym = item.symbol.upper()
            if sym in seen:
                continue
            if market and market.upper() in ("IN", "US") and item.market != market.upper():
                continue
            seen.add(sym)
            merged.append(item)

        final = merged[:15]
        self.cache.set(cache_key, final, ttl_seconds=300)
        return final

    def get_quote(self, symbol: str, bypass_cache: bool = False) -> Optional[Quote]:
        sym = symbol.upper().strip()
        cache_key = f"quote:{sym}"
        if not bypass_cache:
            cached = self.cache.get(cache_key)
            if cached is not None:
                return cached

        market, _ = infer_market(sym)
        known = self._popular_map.get(sym)
        known_name = known.name if known else ""
        known_exchange = known.exchange if known else ""

        quote: Optional[Quote] = None
        if market == "US" and self.finnhub.enabled:
            quote = self.finnhub.get_quote(sym, known_name=known_name, known_exchange=known_exchange)
        if quote is None:
            quote = self.yahoo.get_quote(sym, known_name=known_name)

        if quote is not None:
            self.cache.set(cache_key, quote, ttl_seconds=settings.QUOTE_CACHE_TTL)
        return quote

    def get_quotes_batch(self, symbols: list[str]) -> dict[str, Optional[dict]]:
        out: dict[str, Optional[dict]] = {}
        unique = list(dict.fromkeys(s.upper().strip() for s in symbols if s.strip()))[:30]
        for sym in unique:
            q = self.get_quote(sym)
            out[sym] = q.model_dump() if q else None
        return out

    def get_candles(self, symbol: str, range_key: str = "1M") -> list[Candle]:
        sym = symbol.upper().strip()
        rk = range_key.upper().strip()
        cache_key = f"candles:{sym}:{rk}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        candles = self.yahoo.get_candles(sym, rk)
        if candles:
            ttl = 120 if rk == "1D" else settings.CHART_CACHE_TTL
            self.cache.set(cache_key, candles, ttl_seconds=ttl)
        return candles

    def get_candles_since(self, symbol: str, start_utc: datetime) -> list[Candle]:
        return self.yahoo.get_candles_since(symbol, start_utc)

    def get_fundamentals(self, symbol: str) -> Optional[Fundamentals]:
        sym = symbol.upper().strip()
        cache_key = f"fundamentals:{sym}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        known = self._popular_map.get(sym)
        fund = self.yahoo.get_fundamentals(sym, fallback_meta=known)

        # If Yahoo quoteSummary didn't return P/E or Market Cap for a US stock, enrich from Finnhub
        if fund and fund.market == "US" and (fund.pe_ratio is None or fund.market_cap is None) and self.finnhub.enabled:
            fh = self.finnhub.get_us_fundamentals_fallback(sym)
            if fh:
                if fund.market_cap is None and fh.get("market_cap"):
                    fund.market_cap = fh["market_cap"]
                if fund.pe_ratio is None and fh.get("pe_ratio"):
                    fund.pe_ratio = round(float(fh["pe_ratio"]), 2)
                if fund.week_52_high is None and fh.get("week_52_high"):
                    fund.week_52_high = round(float(fh["week_52_high"]), 2)
                if fund.week_52_low is None and fh.get("week_52_low"):
                    fund.week_52_low = round(float(fh["week_52_low"]), 2)
                if fund.sector == "Unknown" and fh.get("sector"):
                    fund.sector = fh["sector"]

        if fund is not None:
            self.cache.set(cache_key, fund, ttl_seconds=settings.FUNDAMENTALS_CACHE_TTL)
        return fund

    def get_usdinr_rate(self) -> dict:
        cache_key = "fx:USDINR"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        rate = self.yahoo.get_usdinr_rate()
        payload = {"pair": "USD/INR", "rate": rate, "source": "yahoo"}
        self.cache.set(cache_key, payload, ttl_seconds=settings.FX_CACHE_TTL)
        return payload

    def get_benchmarks(self) -> dict:
        nifty = self.get_quote("^NSEI")
        sp500 = self.get_quote("^GSPC")
        return {
            "nifty_50": nifty.model_dump() if nifty else None,
            "sp_500": sp500.model_dump() if sp500 else None,
        }


market_data = MarketDataManager()
