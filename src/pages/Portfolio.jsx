import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { formatMoney, formatPercent, formatShortDate, formatSignedMoney } from '../utils/format';
import InfoTooltip from '../components/InfoTooltip';

const CHART_COLORS = ['#00B386', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#64748B'];

export default function Portfolio({ onSelectStock }) {
  const { state, portfolioSummary, refreshTrackedQuotes, recordLearningEvent } = useTrader();
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [allocMode, setAllocMode] = useState('SECTOR'); // 'SECTOR' | 'STOCK'
  const [refreshing, setRefreshing] = useState(false);

  // Track Lesson 6 task when user views Portfolio Benchmark with brokerage fees enabled
  useEffect(() => {
    if (state.account.brokerageEnabled) {
      recordLearningEvent('checkedBenchmarkWithFees');
    }
  }, [state.account.brokerageEnabled, recordLearningEvent]);

  const filteredHoldings = useMemo(() => {
    if (bucketFilter === 'ALL') return portfolioSummary.holdings;
    return portfolioSummary.holdings.filter((h) => h.bucket === bucketFilter);
  }, [portfolioSummary.holdings, bucketFilter]);

  const bucketStats = useMemo(() => {
    const invested = filteredHoldings.reduce((s, h) => s + h.investedBase, 0);
    const current = filteredHoldings.reduce((s, h) => s + h.currentValueBase, 0);
    const pnl = current - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, current, pnl, pct };
  }, [filteredHoldings]);

  // Allocation chart data (by Stock or by Sector)
  const allocationData = useMemo(() => {
    const map = {};
    for (const h of filteredHoldings) {
      const key = allocMode === 'SECTOR' ? h.sector || 'Unknown' : h.symbol;
      map[key] = (map[key] || 0) + h.currentValueBase;
    }
    const entries = Object.entries(map)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
    return entries;
  }, [filteredHoldings, allocMode]);

  // Portfolio Value Over Time & Normalized Benchmark (% return since day 1)
  const { valueSeries, benchmarkSeries } = useMemo(() => {
    const snaps = state.snapshots || [];
    if (snaps.length === 0) return { valueSeries: [], benchmarkSeries: [] };

    const firstPort = snaps[0].totalValueBase || state.account.startingCash;
    const firstNifty = snaps.find((s) => s.niftyClose)?.niftyClose || null;
    const firstSp500 = snaps.find((s) => s.sp500Close)?.sp500Close || null;

    const val = snaps.map((s) => ({
      date: formatShortDate(s.date),
      value: Number(s.totalValueBase.toFixed(2)),
    }));

    const bench = snaps.map((s) => ({
      date: formatShortDate(s.date),
      Portfolio: Number((((s.totalValueBase - firstPort) / firstPort) * 100).toFixed(2)),
      ...(firstNifty && s.niftyClose
        ? { 'Nifty 50': Number((((s.niftyClose - firstNifty) / firstNifty) * 100).toFixed(2)) }
        : {}),
      ...(firstSp500 && s.sp500Close
        ? { 'S&P 500': Number((((s.sp500Close - firstSp500) / firstSp500) * 100).toFixed(2)) }
        : {}),
    }));

    return { valueSeries: val, benchmarkSeries: bench };
  }, [state.snapshots, state.account.startingCash]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTrackedQuotes();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portfolio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Each stock’s P&L is shown in its native currency; totals convert at 1 USD = ₹
            {portfolioSummary.usdinr.toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Prices
        </button>
      </div>

      {/* Top Summary Cards (Base Currency Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Total Account Value ({portfolioSummary.baseCurrency})</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMoney(portfolioSummary.totalPortfolioBase, portfolioSummary.baseCurrency)}
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${
              portfolioSummary.totalPnlBase >= 0 ? 'text-brand' : 'text-loss'
            }`}
          >
            {formatSignedMoney(portfolioSummary.totalPnlBase, portfolioSummary.baseCurrency)} (
            {formatPercent(portfolioSummary.totalPnlPct)}) overall
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Holdings Market Value</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMoney(portfolioSummary.totalMarketValueBase, portfolioSummary.baseCurrency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Invested: {formatMoney(portfolioSummary.totalInvestedBase, portfolioSummary.baseCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Available Virtual Cash</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatMoney(portfolioSummary.availableCash, portfolioSummary.baseCurrency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Reserved in open orders:{' '}
            {formatMoney(portfolioSummary.reservedCash, portfolioSummary.baseCurrency)}
          </p>
        </div>
      </div>

      {/* Bucket Filter Tabs (All / Long-term / Trading) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {[
            { id: 'ALL', label: 'All Holdings' },
            { id: 'LONG_TERM', label: 'Long-term' },
            { id: 'TRADING', label: 'Trading' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBucketFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                bucketFilter === tab.id
                  ? 'bg-brand text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {bucketFilter !== 'ALL' && filteredHoldings.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Bucket value:{' '}
            <strong className="text-slate-900 dark:text-white">
              {formatMoney(bucketStats.current, portfolioSummary.baseCurrency)}
            </strong>{' '}
            <span className={bucketStats.pnl >= 0 ? 'text-brand font-semibold' : 'text-loss font-semibold'}>
              ({formatPercent(bucketStats.pct)})
            </span>
          </div>
        )}
      </div>

      {/* Holdings Table (Strictly Native-Currency P&L!) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
            Holdings ({filteredHoldings.length})
            <InfoTooltip termKey="bucket" />
          </h3>
          {portfolioSummary.hasForeignHoldings && (
            <span className="text-[11px] text-slate-400">
              Native currency P&L (unaffected by FX swings)
            </span>
          )}
        </div>

        {filteredHoldings.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No holdings in this bucket yet. Head to Explore to research and place your first paper
            trade.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-400 font-medium">
                <tr>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-4 py-3">Bucket</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Avg Buy</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">Value (Native)</th>
                  <th className="px-5 py-3 text-right">P&amp;L (Native)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHoldings.map((h) => {
                  const pos = h.pnlNative >= 0;
                  return (
                    <tr
                      key={`${h.symbol}-${h.bucket}`}
                      onClick={() => onSelectStock(h.symbol)}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {h.symbol}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {h.name} · {h.sector}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            h.bucket === 'LONG_TERM'
                              ? 'bg-brand/12 text-brand'
                              : 'bg-blue-500/12 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {h.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200">
                        {h.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(h.avgBuyPrice, h.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(h.currentPrice, h.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white">
                        {formatMoney(h.currentValueNative, h.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className={`font-semibold ${pos ? 'text-brand' : 'text-loss'}`}>
                          {formatSignedMoney(h.pnlNative, h.currency)}
                        </p>
                        <p className={`text-[11px] ${pos ? 'text-brand' : 'text-loss'}`}>
                          {formatPercent(h.pnlPct)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Grid: Allocation + Portfolio Value + Benchmark Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Pie Chart (Stock / Sector Toggle) */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Allocation
            </h3>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
              {['SECTOR', 'STOCK'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAllocMode(m)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                    allocMode === m
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                >
                  {m === 'SECTOR' ? 'By Sector' : 'By Stock'}
                </button>
              ))}
            </div>
          </div>

          {allocationData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Buy stocks to see your allocation breakdown.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {allocationData.map((entry, idx) => (
                      <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatMoney(val, portfolioSummary.baseCurrency)}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Portfolio Value Over Time */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Portfolio Value Over Time ({portfolioSummary.baseCurrency})
          </h3>
          {valueSeries.length < 2 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Day 1 Recorded:{' '}
                {formatMoney(portfolioSummary.totalPortfolioBase, portfolioSummary.baseCurrency)}
              </p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                A new daily snapshot is saved automatically each day you visit. Check back over the
                coming days and weeks to watch your curve build.
              </p>
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valueSeries}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={65} />
                  <Tooltip formatter={(val) => formatMoney(val, portfolioSummary.baseCurrency)} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00B386"
                    fill="#00B386"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Comparison (Portfolio vs Nifty 50 & S&P 500) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center">
            Benchmark Comparison (% Return vs. Nifty 50 &amp; S&amp;P 500)
            <InfoTooltip termKey="benchmark" />
          </h3>
          <span className="text-[11px] text-slate-400">Indexed to 0% on your start date</span>
        </div>

        {benchmarkSeries.length < 2 ? (
          <div className="py-10 text-center space-y-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Starting benchmark prices captured for today!
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              As new trading days pass, this chart plots your percentage return directly against
              India’s Nifty 50 and the US S&amp;P 500 so you can see whether stock-picking beats a
              simple index fund.
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmarkSeries}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Portfolio" stroke="#00B386" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Nifty 50" stroke="#3B82F6" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="S&P 500" stroke="#F59E0B" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
