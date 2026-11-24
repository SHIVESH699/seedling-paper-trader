"""
Lightweight Yahoo Finance HTTP provider (zero pandas/numpy dependencies!).
Why direct httpx instead of the heavy yfinance package?
- Keeps the Vercel Python serverless bundle tiny (~15MB vs >250MB limit)
- Fast cold starts (<0.5s) and zero native wheel errors on Vercel
- Hits the exact same Yahoo Finance endpoints for NSE (.NS), BSE (.BO), NYSE, NASDAQ,
  Nifty 50 (^NSEI), S&P 500 (^GSPC), and USD/INR (USDINR=X).

Honest note: Yahoo Finance quotes are unofficial and typically delayed ~15 minutes.
Every quote returned here is explicitly tagged is_delayed=True.
"""

from datetime import datetime, timedelta, timezone
import threading
import time
from typing import Optional
import httpx

from market_hours import get_market_status, infer_market
from providers.base import Candle, Fundamentals, MarketDataProvider, Quote, SearchResult

RANGE_CONFIG: dict[str, tuple[str, str]] = {
    "1D": ("1d", "5m"),
    "1W": ("5d", "15m"),
    "1M": ("1mo", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
}

SUPPORTED_EXCHANGES: dict[str, tuple[str, str, str]] = {
    "NSI": ("NSE", "IN", "INR"),
    "NSE": ("NSE", "IN", "INR"),
    "BOM": ("BSE", "IN", "INR"),
    "BSE": ("BSE", "IN", "INR"),
    "NMS": ("NASDAQ", "US", "USD"),
    "NGM": ("NASDAQ", "US", "USD"),
    "NCM": ("NASDAQ", "US", "USD"),
    "NYQ": ("NYSE", "US", "USD"),
    "PCX": ("NYSE", "US", "USD"),
    "ASE": ("NYSE", "US", "USD"),
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/plain,*/*",
}


class YahooFinanceProvider(MarketDataProvider):
    name = "yahoo"

    def __init__(self) -> None:
        self._client = httpx.Client(timeout=8.0, headers=HEADERS, follow_redirects=True)
        self._crumb: Optional[str] = None
        self._crumb_expires: float = 0.0
        self._crumb_lock = threading.Lock()

    def _safe_exchange(self, raw_exchange: str, market: str, symbol: str) -> str:
        if raw_exchange in SUPPORTED_EXCHANGES:
            return SUPPORTED_EXCHANGES[raw_exchange][0]
        if symbol.endswith(".NS"):
            return "NSE"
        if symbol.endswith(".BO"):
            return "BSE"
        return "NSE/BSE" if market == "IN" else "NYSE/NASDAQ"

    def _fetch_chart_json(self, symbol: str, params: dict) -> Optional[dict]:
        for host in ("query1.finance.yahoo.com", "query2.finance.yahoo.com"):
            try:
                resp = self._client.get(
                    f"https://{host}/v8/finance/chart/{symbol}",
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = (data.get("chart") or {}).get("result")
                    if results:
                        return results[0]
            except Exception:
                continue
        return None

    def _ensure_crumb(self) -> Optional[str]:
        now = time.monotonic()
        with self._crumb_lock:
            if self._crumb and now < self._crumb_expires:
                return self._crumb
            try:
                # Seed Yahoo session cookie
                self._client.get("https://fc.yahoo.com")
                resp = self._client.get("https://query1.finance.yahoo.com/v1/test/getcrumb")
                if resp.status_code == 200 and resp.text and "Unauthorized" not in resp.text:
                    self._crumb = resp.text.strip()
                    self._crumb_expires = now + 1800
                    return self._crumb
            except Exception:
                return None
        return None

    def _parse_candles(self, result: dict) -> list[Candle]:
        timestamps = result.get("timestamp") or []
        indicators = (result.get("indicators") or {}).get("quote") or []
        if not timestamps or not indicators:
            return []

        q = indicators[0]
        opens = q.get("open") or []
        highs = q.get("high") or []
        lows = q.get("low") or []
        closes = q.get("close") or []
        volumes = q.get("volume") or []

        # Deduplicate and keep strictly ascending timestamps (required by lightweight-charts)
        by_time: dict[int, Candle] = {}
        for i, ts in enumerate(timestamps):
            try:
                c = closes[i] if i < len(closes) else None
                o = opens[i] if i < len(opens) else c
                h = highs[i] if i < len(highs) else c
                l = lows[i] if i < len(lows) else c
                v = volumes[i] if i < len(volumes) else 0
                if c is None or o is None or h is None or l is None:
                    continue
                t_int = int(ts)
                iso = datetime.fromtimestamp(t_int, tz=timezone.utc).isoformat()
                by_time[t_int] = Candle(
                    time=t_int,
                    iso_time=iso,
                    open=round(float(o), 2),
                    high=round(float(h), 2),
                    low=round(float(l), 2),
                    close=round(float(c), 2),
                    volume=int(v) if v is not None else 0,
                )
            except Exception:
                continue

        return [by_time[k] for k in sorted(by_time.keys())]

    def get_quote(self, symbol: str, known_name: str = "") -> Optional[Quote]:
        sym = symbol.upper().strip()
        market, default_currency = infer_market(sym)

        result = self._fetch_chart_json(sym, {"range": "5d", "interval": "1d"})
        if not result:
            return None

        meta = result.get("meta") or {}
        price = meta.get("regularMarketPrice")
        candles = self._parse_candles(result)

        if price is None and candles:
            price = candles[-1].close
        if price is None or float(price) <= 0:
            return None

        price = float(price)
        prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
        if len(candles) >= 2:
            # Prefer exact prior trading day's close when 5d daily candles are available
            if candles[-1].close and abs(price - candles[-1].close) / max(price, 1e-6) < 0.05:
                prev_close = candles[-2].close
            else:
                prev_close = candles[-1].close
        prev_close = float(prev_close) if prev_close else price

        day_change = price - prev_close
        day_change_pct = (day_change / prev_close * 100.0) if prev_close else 0.0

        day_high = meta.get("regularMarketDayHigh") or (candles[-1].high if candles else None)
        day_low = meta.get("regularMarketDayLow") or (candles[-1].low if candles else None)
        w52_high = meta.get("fiftyTwoWeekHigh")
        w52_low = meta.get("fiftyTwoWeekLow")

        raw_exchange = str(meta.get("exchangeName") or "")
        currency = str(meta.get("currency") or default_currency).upper()
        name = known_name or meta.get("shortName") or meta.get("longName") or sym

        status = get_market_status(market)
        delay_label = "Delayed (~15m)" if status["is_open"] else "Market Closed"

        return Quote(
            symbol=sym,
            name=name,
            market=market,
            exchange=self._safe_exchange(raw_exchange, market, sym),
            currency=currency if currency in ("INR", "USD") else default_currency,
            price=round(price, 2),
            previous_close=round(prev_close, 2),
            day_change=round(day_change, 2),
            day_change_pct=round(day_change_pct, 2),
            day_high=round(float(day_high), 2) if day_high else None,
            day_low=round(float(day_low), 2) if day_low else None,
            week_52_high=round(float(w52_high), 2) if w52_high else None,
            week_52_low=round(float(w52_low), 2) if w52_low else None,
            is_delayed=True,
            delay_label=delay_label,
            data_source="yahoo",
            as_of=datetime.now(timezone.utc).isoformat(),
        )

    def get_candles(self, symbol: str, range_key: str) -> list[Candle]:
        sym = symbol.upper().strip()
        rk = range_key.upper().strip()
        rng, interval = RANGE_CONFIG.get(rk, ("1mo", "1d"))

        result = self._fetch_chart_json(sym, {"range": rng, "interval": interval})
        candles = self._parse_candles(result) if result else []

        # If 1D is empty (weekend/holiday/pre-open), pull the most recent trading day's 5m session
        if not candles and rk == "1D":
            fallback = self._fetch_chart_json(sym, {"range": "5d", "interval": "5m"})
            all_c = self._parse_candles(fallback) if fallback else []
            if all_c:
                last_day = datetime.fromtimestamp(all_c[-1].time, tz=timezone.utc).date()
                candles = [
                    c for c in all_c
                    if datetime.fromtimestamp(c.time, tz=timezone.utc).date() == last_day
                ]
        return candles

    def get_candles_since(self, symbol: str, start_utc: datetime) -> list[Candle]:
        """
        Fetch historical candles from `start_utc` until now for limit-order & queued-order backfill.
        Uses 5m candles up to 5 days, 15m up to 55 days, and 1d candles beyond 55 days.
        """
        sym = symbol.upper().strip()
        if start_utc.tzinfo is None:
            start_utc = start_utc.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        age = now_utc - start_utc

        if age <= timedelta(days=5):
            interval = "5m"
        elif age <= timedelta(days=55):
            interval = "15m"
        else:
            interval = "1d"

        p1 = int((start_utc - timedelta(minutes=15)).timestamp())
        p2 = int(now_utc.timestamp()) + 60
        result = self._fetch_chart_json(
            sym,
            {"period1": p1, "period2": p2, "interval": interval},
        )
        candles = self._parse_candles(result) if result else []
        start_ts = int(start_utc.timestamp())
        return [c for c in candles if c.time >= start_ts]

    def _raw_val(self, obj: dict, key: str):
        v = obj.get(key)
        if isinstance(v, dict):
            return v.get("raw")
        return v

    def get_fundamentals(self, symbol: str, fallback_meta: Optional[SearchResult] = None) -> Optional[Fundamentals]:
        sym = symbol.upper().strip()
        market, default_currency = infer_market(sym)

        # Always start with chart metadata (guaranteed 52W High/Low, exchange, currency)
        chart_res = self._fetch_chart_json(sym, {"range": "1y", "interval": "1wk"})
        meta = (chart_res or {}).get("meta") or {}
        candles = self._parse_candles(chart_res) if chart_res else []

        w52_high = meta.get("fiftyTwoWeekHigh") or (max((c.high for c in candles), default=None))
        w52_low = meta.get("fiftyTwoWeekLow") or (min((c.low for c in candles), default=None))
        raw_exch = str(meta.get("exchangeName") or "")
        currency = str(meta.get("currency") or default_currency).upper()

        name = (fallback_meta.name if fallback_meta else None) or meta.get("longName") or meta.get("shortName") or sym
        sector = (fallback_meta.sector if fallback_meta and fallback_meta.sector else "Unknown")
        industry = "Equities"
        market_cap = None
        pe_ratio = None
        description = (
            fallback_meta.description
            if fallback_meta and fallback_meta.description
            else "Detailed company overview is temporarily unavailable from the free data provider."
        )

        # Attempt rich Yahoo quoteSummary via cookie + crumb
        crumb = self._ensure_crumb()
        if crumb:
            try:
                resp = self._client.get(
                    f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{sym}",
                    params={
                        "modules": "assetProfile,summaryDetail,defaultKeyStatistics,price",
                        "crumb": crumb,
                    },
                )
                if resp.status_code == 200:
                    res_list = (resp.json().get("quoteSummary") or {}).get("result") or []
                    if res_list:
                        r = res_list[0]
                        prof = r.get("assetProfile") or {}
                        summ = r.get("summaryDetail") or {}
                        stats = r.get("defaultKeyStatistics") or {}
                        price_mod = r.get("price") or {}

                        name = price_mod.get("longName") or price_mod.get("shortName") or name
                        sector = prof.get("sector") or ("ETF" if price_mod.get("quoteType") == "ETF" else sector)
                        industry = prof.get("industry") or price_mod.get("quoteType") or industry
                        market_cap = self._raw_val(price_mod, "marketCap") or self._raw_val(summ, "marketCap")
                        pe_ratio = self._raw_val(summ, "trailingPE") or self._raw_val(stats, "forwardPE") or self._raw_val(summ, "forwardPE")
                        w52_high = self._raw_val(summ, "fiftyTwoWeekHigh") or w52_high
                        w52_low = self._raw_val(summ, "fiftyTwoWeekLow") or w52_low

                        raw_desc = prof.get("longBusinessSummary")
                        if raw_desc:
                            if len(raw_desc) > 520:
                                clip = raw_desc[:520]
                                dot = clip.rfind(".")
                                raw_desc = clip[: dot + 1] if dot > 200 else clip + "..."
                            description = raw_desc
            except Exception:
                pass

        return Fundamentals(
            symbol=sym,
            name=name,
            market=market,
            exchange=self._safe_exchange(raw_exch, market, sym),
            currency=currency if currency in ("INR", "USD") else default_currency,
            sector=sector,
            industry=industry,
            market_cap=float(market_cap) if market_cap else None,
            pe_ratio=round(float(pe_ratio), 2) if pe_ratio else None,
            week_52_high=round(float(w52_high), 2) if w52_high else None,
            week_52_low=round(float(w52_low), 2) if w52_low else None,
            description=description,
            data_source="yahoo",
        )

    def get_usdinr_rate(self) -> float:
        result = self._fetch_chart_json("USDINR=X", {"range": "5d", "interval": "1d"})
        if result:
            meta = result.get("meta") or {}
            px = meta.get("regularMarketPrice")
            if px and float(px) > 50:
                return round(float(px), 4)
            candles = self._parse_candles(result)
            if candles and candles[-1].close > 50:
                return round(candles[-1].close, 4)
        return 84.5

    def search(self, query: str) -> list[SearchResult]:
        try:
            resp = self._client.get(
                "https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": query, "quotesCount": 15, "newsCount": 0},
            )
            if resp.status_code != 200:
                return []
            payload = resp.json()
        except Exception:
            return []

        results: list[SearchResult] = []
        for item in payload.get("quotes", []):
            if item.get("quoteType", "") not in ("EQUITY", "ETF"):
                continue
            raw_exch = item.get("exchange", "")
            if raw_exch not in SUPPORTED_EXCHANGES:
                continue
            exch_label, market, currency = SUPPORTED_EXCHANGES[raw_exch]
            sym = item.get("symbol", "")
            name = item.get("shortname") or item.get("longname") or sym
            results.append(
                SearchResult(
                    symbol=sym,
                    name=name,
                    exchange=exch_label,
                    market=market,
                    currency=currency,
                    sector=item.get("sector"),
                )
            )
        return results
