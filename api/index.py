"""
Vercel Serverless Python FastAPI Entrypoint (also runs locally via uvicorn api.index:app).
Exposes the swappable market data layer for NSE, BSE, NYSE, and NASDAQ.
"""

from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Optional

# Ensure api/ is importable regardless of whether run on Vercel or locally
API_DIR = Path(__file__).resolve().parent
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from market_hours import get_market_status
from providers.manager import market_data

VALID_RANGES = {"1D", "1W", "1M", "1Y", "5Y"}

app = FastAPI(
    title="Seedling Paper Trader Market API",
    description="Swappable market data API for NSE/BSE and NYSE/NASDAQ.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "us_provider": "finnhub (live)" if market_data.finnhub.enabled else "yahoo (delayed ~15m)",
        "india_provider": "yahoo (delayed ~15m)",
        "disclaimer": "Paper trading simulator for educational purposes only. Past virtual performance does not predict real results.",
    }


@app.get("/api/market/status")
def market_status():
    return {
        "IN": get_market_status("IN"),
        "US": get_market_status("US"),
        "finnhub_enabled": market_data.finnhub.enabled,
    }


@app.get("/api/market/popular")
def popular_stocks(market: Optional[str] = Query(default=None)):
    return {"results": [item.model_dump() for item in market_data.get_popular(market)]}


@app.get("/api/market/search")
def search_stocks(
    q: str = Query(default=""),
    market: Optional[str] = Query(default=None),
):
    results = market_data.search(q, market=market)
    return {"query": q, "count": len(results), "results": [r.model_dump() for r in results]}


@app.get("/api/market/quote/{symbol}")
def stock_quote(symbol: str, refresh: bool = Query(default=False)):
    quote = market_data.get_quote(symbol, bypass_cache=refresh)
    if quote is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch quote for '{symbol}'. Use .NS for NSE or .BO for BSE stocks.",
        )
    return quote.model_dump()


@app.get("/api/market/quotes")
def batch_quotes(symbols: str = Query(..., description="Comma-separated tickers")):
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return {"quotes": market_data.get_quotes_batch(sym_list)}


@app.get("/api/market/chart/{symbol}")
def stock_chart(symbol: str, range: str = Query(default="1M")):
    rk = range.upper().strip()
    if rk not in VALID_RANGES:
        raise HTTPException(status_code=400, detail="range must be one of 1D, 1W, 1M, 1Y, 5Y")
    candles = market_data.get_candles(symbol, rk)
    return {
        "symbol": symbol.upper(),
        "range": rk,
        "count": len(candles),
        "candles": [c.model_dump() for c in candles],
    }


@app.get("/api/market/candles-since/{symbol}")
def candles_since(symbol: str, since: str = Query(..., description="ISO-8601 UTC timestamp")):
    """Returns OHLC candles since an order was placed for accurate offline limit-order backfill."""
    try:
        cleaned = since.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ISO timestamp for 'since'.")

    candles = market_data.get_candles_since(symbol, dt.astimezone(timezone.utc))
    return {
        "symbol": symbol.upper(),
        "since": dt.astimezone(timezone.utc).isoformat(),
        "count": len(candles),
        "candles": [c.model_dump() for c in candles],
    }


@app.get("/api/market/fundamentals/{symbol}")
def stock_fundamentals(symbol: str):
    data = market_data.get_fundamentals(symbol)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Fundamentals unavailable for '{symbol}'.")
    return data.model_dump()


@app.get("/api/market/fx/usdinr")
def usdinr_rate():
    return market_data.get_usdinr_rate()


@app.get("/api/market/benchmarks")
def benchmarks():
    return market_data.get_benchmarks()
