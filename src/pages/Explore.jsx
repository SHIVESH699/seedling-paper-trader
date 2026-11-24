import React, { useEffect, useState } from 'react';
import { Search, Bookmark, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { marketApi } from '../api/marketApi';
import { useTrader } from '../context/TraderContext';
import { formatMoney, formatPercent } from '../utils/format';

export default function Explore({ onSelectStock }) {
  const { state, quotesMap, setQuotesMap, benchmarks, marketStatus, toggleWatchlist, refreshTrackedQuotes } =
    useTrader();

  const [query, setQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [results, setResults] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Debounced hybrid search (local instant + Yahoo full NSE/BSE/NYSE/NASDAQ)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingList(true);
      try {
        const mkt = marketFilter === 'ALL' ? '' : marketFilter;
        const data = query.trim()
          ? await marketApi.search(query.trim(), mkt)
          : await marketApi.getPopular(mkt);
        if (!active) return;
        const list = (data.results || []).slice(0, 16);
        setResults(list);

        // Fetch batch quotes for top visible stocks not yet cached
        const missing = list
          .slice(0, 10)
          .map((s) => s.symbol)
          .filter((sym) => !quotesMap[sym]);
        if (missing.length > 0) {
          const qRes = await marketApi.getBatchQuotes(missing);
          if (!active) return;
          const valid = {};
          for (const [k, v] of Object.entries(qRes.quotes || {})) {
            if (v) valid[k] = v;
          }
          setQuotesMap((prev) => ({ ...prev, ...valid }));
        }
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoadingList(false);
      }
    }, query.trim() ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, marketFilter]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshTrackedQuotes(results.slice(0, 10).map((r) => r.symbol));
    setRefreshing(false);
  };

  const isWatched = (sym) => state.watchlist.some((w) => w.symbol === sym.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header & Market Indices */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Explore Markets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search any company listed on NSE, BSE, NYSE, or NASDAQ
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      {/* Benchmarks Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'NIFTY 50', data: benchmarks?.nifty_50, status: marketStatus?.IN },
          { label: 'S&P 500', data: benchmarks?.sp_500, status: marketStatus?.US },
        ].map((idx) => {
          const pos = (idx.data?.day_change || 0) >= 0;
          return (
            <div
              key={idx.label}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {idx.label}
                  </span>
                  {idx.status && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        idx.status.is_open
                          ? 'bg-brand/15 text-brand'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx.status.is_open ? 'Open' : 'Closed'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {idx.data?.delay_label || 'Benchmark Index'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {idx.data ? idx.data.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                </p>
                {idx.data && (
                  <p className={`text-xs font-medium ${pos ? 'text-brand' : 'text-loss'}`}>
                    {formatPercent(idx.data.day_change_pct)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Bar & Market Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Reliance, TCS, Apple, NVDA, Nifty ETF..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-sm focus:border-brand focus:outline-none shadow-sm"
          />
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 self-start">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'IN', label: 'India' },
            { id: 'US', label: 'US' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMarketFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                marketFilter === f.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist Strip (when not actively searching) */}
      {!query.trim() && state.watchlist.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Your Watchlist ({state.watchlist.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.watchlist.map((w) => {
              const q = quotesMap[w.symbol];
              const pos = (q?.day_change || 0) >= 0;
              return (
                <div
                  key={w.symbol}
                  onClick={() => onSelectStock(w.symbol)}
                  className="cursor-pointer rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-brand/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {w.symbol}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{w.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(w);
                      }}
                      aria-label="Remove from watchlist"
                      className="text-brand hover:opacity-75"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {q ? formatMoney(q.price, q.currency) : '—'}
                    </span>
                    {q && (
                      <span
                        className={`text-xs font-medium inline-flex items-center ${
                          pos ? 'text-brand' : 'text-loss'
                        }`}
                      >
                        {pos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {formatPercent(q.day_change_pct)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search Results / Popular Stocks */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {query.trim() ? `Search Results for "${query.trim()}"` : 'Popular Companies & ETFs'}
        </h3>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {loadingList ? (
            <div className="p-8 text-center text-sm text-slate-400">Searching markets...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No matching NSE, BSE, NYSE, or NASDAQ stocks found. Try a ticker like RELIANCE.NS or AAPL.
            </div>
          ) : (
            results.map((item) => {
              const q = quotesMap[item.symbol];
              const pos = (q?.day_change || 0) >= 0;
              const watched = isWatched(item.symbol);
              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectStock(item.symbol)}
                  className="cursor-pointer px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        {item.exchange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.symbol}
                      {item.sector ? ` · ${item.sector}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q ? formatMoney(q.price, q.currency) : 'Open →'}
                      </p>
                      {q && (
                        <p className={`text-xs font-medium ${pos ? 'text-brand' : 'text-loss'}`}>
                          {formatPercent(q.day_change_pct)}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(item);
                      }}
                      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        watched
                          ? 'text-brand bg-brand/10'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${watched ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
