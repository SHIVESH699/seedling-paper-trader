"""
Shared models and abstract MarketDataProvider interface.
Swap or add providers (e.g., Kite Connect, Polygon, Twelve Data) by subclassing
MarketDataProvider and wiring it into manager.py.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Quote(BaseModel):
    symbol: str
    name: str
    market: str              # 'IN' or 'US'
    exchange: str
    currency: str            # 'INR' or 'USD'
    price: float
    previous_close: float
    day_change: float
    day_change_pct: float
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    is_delayed: bool
    delay_label: str         # "Live", "Delayed (~15m)", or "Market Closed"
    data_source: str         # "finnhub" or "yahoo"
    as_of: str


class Candle(BaseModel):
    time: int                # Unix epoch seconds (strictly ascending)
    iso_time: str            # ISO-8601 UTC timestamp
    open: float
    high: float
    low: float
    close: float
    volume: int


class Fundamentals(BaseModel):
    symbol: str
    name: str
    market: str
    exchange: str
    currency: str
    sector: str
    industry: str
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    description: str
    data_source: str = "yahoo"


class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    market: str
    currency: str
    sector: Optional[str] = None
    description: Optional[str] = None


class MarketDataProvider(ABC):
    name: str = "base"

    @abstractmethod
    def get_quote(self, symbol: str) -> Optional[Quote]:
        pass

    @abstractmethod
    def get_candles(self, symbol: str, range_key: str) -> list[Candle]:
        pass

    @abstractmethod
    def get_candles_since(self, symbol: str, start_utc: datetime) -> list[Candle]:
        pass

    @abstractmethod
    def get_fundamentals(self, symbol: str) -> Optional[Fundamentals]:
        pass

    @abstractmethod
    def search(self, query: str) -> list[SearchResult]:
        pass
