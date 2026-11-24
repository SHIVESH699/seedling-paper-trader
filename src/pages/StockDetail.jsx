import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, RefreshCw, Clock } from 'lucide-react';
import { marketApi } from '../api/marketApi';
import { useTrader } from '../context/TraderContext';
import StockChart from '../components/StockChart';
import OrderTicket from '../components/OrderTicket';
import InfoTooltip from '../components/InfoTooltip';
import { formatMarketCap, formatMoney, formatPercent, formatSignedMoney } from '../utils/format';

export default function StockDetail({ symbol, onBack }) {
  const { state, setQuotesMap, toggleWatchlist, recordLearningEvent } = useTrader();

  const [quote, setQuote] = useState(null);
  const [fundamentals, setFundamentals] = useState(null);
  const [candles, setCandles] = useState([]);
  const [range, setRange] = useState('1M');
  const [chartType, setChartType] = useState('LINE');
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState('');

  const watched = state.watchlist.some((w) => w.symbol === symbol.toUpperCase());

  // Track Lesson 3 practical task automatically when user views 1Y/5Y Candlesticks
  useEffect(() => {
    if (chartType === 'CANDLE' && (range === '1Y' || range === '5Y')) {
      recordLearningEvent('inspectedCandlestickLongRange');
    }
  }, [chartType, range, recordLearningEvent]);

  const loadQuoteAndFundamentals = async (forceRefresh = false) => {
    setError('');
    try {
      const [qRes, fRes] = await Promise.allSettled([
        marketApi.getQuote(symbol, forceRefresh),
        marketApi.getFundamentals(symbol),
      ]);

      if (qRes.status === 'fulfilled' && qRes.value) {
        setQuote(qRes.value);
        setQuotesMap((prev) => ({ ...prev, [qRes.value.symbol]: qRes.value }));
      } else {
        setError(`Could not fetch quote for ${symbol}. Check the symbol or try refreshing.`);
      }

      if (fRes.status === 'fulfilled' && fRes.value) {
        setFundamentals(fRes.value);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setQuote(null);
    setFundamentals(null);
    loadQuoteAndFundamentals(false);
  }, [symbol]);

  useEffect(() => {
    let active = true;
    setLoadingChart(true);
    marketApi
      .getChart(symbol, range)
      .then((res) => {
        if (active) setCandles(res.candles || []);
      })
      .catch(() => {
        if (active) setCandles([]);
      })
      .finally(() => {
        if (active) setLoadingChart(false);
      });
    return () => {
      active = false;
    };
  }, [symbol, range]);

  const myHoldings = state.holdings.filter((h) => h.symbol === symbol.toUpperCase());

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </button>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-400">
          Loading {symbol} market data...
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </button>
        <div className="rounded-2xl border border-loss/30 bg-loss/5 p-6 text-sm text-loss">
          {error || `Unable to load ${symbol}.`}
        </div>
      </div>
    );
  }

  const positive = quote.day_change >= 0;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadQuoteAndFundamentals(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              toggleWatchlist({
                symbol: quote.symbol,
                name: fundamentals?.name || quote.name,
                market: quote.market,
                currency: quote.currency,
                exchange: quote.exchange,
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              watched
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${watched ? 'fill-current' : ''}`} />
            {watched ? 'Watching' : 'Watchlist'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Price Header, Chart & Fundamentals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {fundamentals?.name || quote.name}
                  </h2>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {quote.exchange}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {quote.symbol}
                  {fundamentals?.sector && fundamentals.sector !== 'Unknown'
                    ? ` · ${fundamentals.sector}`
                    : ''}
                </p>
              </div>

              {/* Honest Live / Delayed Badge */}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  quote.is_delayed
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-brand/15 text-brand'
                }`}
              >
                <Clock className="w-3 h-3" />
                {quote.delay_label}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatMoney(quote.price, quote.currency)}
              </span>
              <span className={`text-sm font-semibold ${positive ? 'text-brand' : 'text-loss'}`}>
                {formatSignedMoney(quote.day_change, quote.currency)} ({formatPercent(quote.day_change_pct)})
              </span>
              <span className="text-xs text-slate-400">Today</span>
            </div>

            <StockChart
              candles={candles}
              loading={loadingChart}
              range={range}
              onRangeChange={setRange}
              chartType={chartType}
              onChartTypeChange={setChartType}
              positive={positive}
            />
          </div>

          {/* Your Current Position in This Stock (if held) */}
          {myHoldings.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Your Holdings in {quote.symbol}
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myHoldings.map((h) => {
                  const currentVal = h.quantity * quote.price;
                  const invested = h.quantity * h.avgBuyPrice;
                  const pnl = currentVal - invested;
                  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                  return (
                    <div key={h.bucket} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {h.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'} Bucket
                        </span>
                        <p className="text-slate-400 mt-0.5">
                          {h.quantity} shares · Avg {formatMoney(h.avgBuyPrice, h.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatMoney(currentVal, h.currency)}
                        </p>
                        <p className={pnl >= 0 ? 'text-brand font-medium' : 'text-loss font-medium'}>
                          {formatSignedMoney(pnl, h.currency)} ({formatPercent(pnlPct)})
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fundamentals Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fundamentals & Overview
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                <p className="text-[11px] text-slate-400 flex items-center">
                  Market Cap
                  <InfoTooltip termKey="marketCap" />
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {formatMarketCap(fundamentals?.market_cap, quote.currency)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                <p className="text-[11px] text-slate-400 flex items-center">
                  P/E Ratio
                  <InfoTooltip termKey="peRatio" />
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {fundamentals?.pe_ratio ? fundamentals.pe_ratio.toFixed(2) : '—'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                <p className="text-[11px] text-slate-400 flex items-center">
                  52W High
                  <InfoTooltip termKey="week52" />
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {formatMoney(fundamentals?.week_52_high ?? quote.week_52_high, quote.currency)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
                <p className="text-[11px] text-slate-400">52W Low</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {formatMoney(fundamentals?.week_52_low ?? quote.week_52_low, quote.currency)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                About the Business
              </p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {fundamentals?.description || 'Company summary unavailable from free data feed.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Order Ticket */}
        <div className="lg:sticky lg:top-6">
          <OrderTicket quote={quote} fundamentals={fundamentals} />
        </div>
      </div>
    </div>
  );
}
