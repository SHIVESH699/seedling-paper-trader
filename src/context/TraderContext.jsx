/**
 * Central state manager for Seedling Paper Trader.
 * - Persists virtual account, holdings, orders, transactions, watchlist, snapshots & lessons in localStorage.
 * - On app load (and manual Sync), backfills OPEN limit orders & QUEUED market orders against
 *   real historical OHLC candles from /api/market/candles-since.
 * - Periodically refreshes quotes for held/watched/pending symbols while the tab is open.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { marketApi } from '../api/marketApi';
import {
  computePortfolioSummary,
  createAndProcessOrder,
  createInitialState,
  evaluateOrderAgainstCandles,
  fillOrderInState,
  loadState,
  saveState,
  upsertTodaySnapshot,
} from '../engine/tradingEngine';
import { buildPostTradeReflection } from '../engine/coachingEngine';

const TraderContext = createContext();

export function TraderProvider({ children }) {
  const [state, setState] = useState(() => loadState());
  const [quotesMap, setQuotesMap] = useState({});
  const [usdinr, setUsdinr] = useState(84.5);
  const [marketStatus, setMarketStatus] = useState(null);
  const [benchmarks, setBenchmarks] = useState({ nifty_50: null, sp_500: null });
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);
  const [postTradeReflection, setPostTradeReflection] = useState(null);

  const stateRef = useRef(state);
  const quotesRef = useRef(quotesMap);
  const usdinrRef = useRef(usdinr);
  const hasBackfilledRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    quotesRef.current = quotesMap;
  }, [quotesMap]);

  useEffect(() => {
    usdinrRef.current = usdinr;
  }, [usdinr]);

  const refreshMarketMeta = useCallback(async () => {
    try {
      const [statusRes, fxRes, benchRes] = await Promise.allSettled([
        marketApi.getStatus(),
        marketApi.getFxRate(),
        marketApi.getBenchmarks(),
      ]);
      if (statusRes.status === 'fulfilled') setMarketStatus(statusRes.value);
      if (fxRes.status === 'fulfilled' && fxRes.value?.rate) setUsdinr(fxRes.value.rate);
      if (benchRes.status === 'fulfilled') setBenchmarks(benchRes.value);
    } catch {
      // handled gracefully per-endpoint
    }
  }, []);

  const refreshTrackedQuotes = useCallback(async (extraSymbols = []) => {
    const s = stateRef.current;
    const symbols = [
      ...s.holdings.map((h) => h.symbol),
      ...s.watchlist.map((w) => w.symbol),
      ...s.orders
        .filter((o) => o.status === 'OPEN' || o.status === 'QUEUED')
        .map((o) => o.symbol),
      ...extraSymbols,
    ];
    const unique = [...new Set(symbols)];
    if (unique.length === 0) return {};

    try {
      const res = await marketApi.getBatchQuotes(unique);
      const nextQuotes = {};
      for (const [sym, q] of Object.entries(res.quotes || {})) {
        if (q) nextQuotes[sym] = q;
      }
      setQuotesMap((prev) => ({ ...prev, ...nextQuotes }));
      return nextQuotes;
    } catch {
      return {};
    }
  }, []);

  /**
   * Startup & on-demand backfill: checks historical candles since each OPEN limit order
   * or QUEUED market order was placed, filling chronologically at the accurate historical
   * price & candle time if it should have triggered while the app was closed.
   */
  const syncPendingOrders = useCallback(async (isStartup = false) => {
    const current = stateRef.current;
    const pending = current.orders
      .filter((o) => o.status === 'OPEN' || o.status === 'QUEUED')
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (pending.length === 0) return { filledCount: 0, rejectedCount: 0 };

    setSyncingOrders(true);
    let workingState = current;
    let filledCount = 0;
    let rejectedCount = 0;
    const filledDetails = [];

    try {
      let currentFx = usdinrRef.current;
      try {
        const fxRes = await marketApi.getFxRate();
        if (fxRes?.rate) {
          currentFx = fxRes.rate;
          setUsdinr(fxRes.rate);
        }
      } catch {
        // use cached fx
      }

      let currentStatus = marketStatus;
      if (!currentStatus) {
        try {
          currentStatus = await marketApi.getStatus();
          setMarketStatus(currentStatus);
        } catch {
          // ignore
        }
      }

      for (const order of pending) {
        let trigger = null;

        // 1. Check historical OHLC candles since order creation (handles offline triggers accurately)
        try {
          const hist = await marketApi.getCandlesSince(order.symbol, order.createdAt);
          trigger = evaluateOrderAgainstCandles(order, hist?.candles || []);
        } catch {
          // fall back to live quote check below
        }

        // 2. If no historical candle trigger yet, check live quote if that market is currently open
        if (!trigger && currentStatus?.[order.market]?.is_open) {
          try {
            const q = await marketApi.getQuote(order.symbol, true);
            if (q) {
              setQuotesMap((prev) => ({ ...prev, [q.symbol]: q }));
              if (order.orderType === 'MARKET') {
                trigger = { triggerPrice: q.price, triggerTime: new Date().toISOString() };
              } else if (order.orderType === 'LIMIT' && order.limitPrice != null) {
                if (order.side === 'BUY' && q.price <= order.limitPrice) {
                  trigger = { triggerPrice: q.price, triggerTime: new Date().toISOString() };
                } else if (order.side === 'SELL' && q.price >= order.limitPrice) {
                  trigger = { triggerPrice: q.price, triggerTime: new Date().toISOString() };
                }
              }
            }
          } catch {
            // ignore
          }
        }

        if (trigger) {
          const res = fillOrderInState(
            workingState,
            order.id,
            trigger.triggerPrice,
            trigger.triggerTime,
            currentFx
          );
          workingState = res.nextState;
          if (res.rejected) {
            rejectedCount += 1;
          } else if (res.filledOrder) {
            filledCount += 1;
            filledDetails.push(`${res.filledOrder.side} ${res.filledOrder.quantity} ${res.filledOrder.symbol}`);
          }
        }
      }

      if (filledCount > 0 || rejectedCount > 0) {
        setState(workingState);
        const prefix = isStartup ? 'While you were away, ' : '';
        const parts = [];
        if (filledCount > 0) parts.push(`${filledCount} pending order(s) filled (${filledDetails.join(', ')})`);
        if (rejectedCount > 0) parts.push(`${rejectedCount} order(s) rejected due to insufficient funds/shares`);
        setBannerNotice(`${prefix}${parts.join('; ')}.`);
      }
    } finally {
      setSyncingOrders(false);
    }

    return { filledCount, rejectedCount };
  }, [marketStatus]);

  // Initial load: fetch status, FX, benchmarks, tracked quotes, and run startup backfill once
  useEffect(() => {
    (async () => {
      await refreshMarketMeta();
      await refreshTrackedQuotes();
      if (!hasBackfilledRef.current) {
        hasBackfilledRef.current = true;
        await syncPendingOrders(true);
      }
    })();
  }, [refreshMarketMeta, refreshTrackedQuotes, syncPendingOrders]);

  // Gentle periodic refresh every 60 seconds while tab is open (respects free rate limits)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshTrackedQuotes();
      syncPendingOrders(false);
    }, 60000);
    return () => clearInterval(id);
  }, [refreshTrackedQuotes, syncPendingOrders]);

  // Compute live portfolio summary
  const portfolioSummary = useMemo(
    () => computePortfolioSummary(state, quotesMap, usdinr),
    [state, quotesMap, usdinr]
  );

  // Record daily portfolio snapshot whenever initialized & benchmarks or holdings update
  useEffect(() => {
    if (!state.account.initialized) return;
    const todaySnap = state.snapshots[state.snapshots.length - 1];
    const hasChanged =
      !todaySnap ||
      Math.abs(todaySnap.totalValueBase - portfolioSummary.totalPortfolioBase) >= 1 ||
      (!todaySnap.niftyClose && benchmarks?.nifty_50?.price) ||
      (!todaySnap.sp500Close && benchmarks?.sp_500?.price);

    if (hasChanged) {
      setState((prev) => upsertTodaySnapshot(prev, portfolioSummary, benchmarks));
    }
  }, [
    state.account.initialized,
    portfolioSummary.totalPortfolioBase,
    benchmarks?.nifty_50?.price,
    benchmarks?.sp_500?.price,
  ]);

  // Actions
  const setupAccount = useCallback(({ baseCurrency, startingCash, brokerageEnabled }) => {
    const fresh = createInitialState();
    fresh.account = {
      ...fresh.account,
      initialized: true,
      baseCurrency,
      startingCash: Number(startingCash),
      cashBalance: Number(startingCash),
      brokerageEnabled: Boolean(brokerageEnabled),
      createdAt: new Date().toISOString(),
    };
    setState(fresh);
  }, []);

  const resetAccount = useCallback(({ baseCurrency, startingCash, keepWatchlist = true, keepLessons = true }) => {
    setState((prev) => {
      const fresh = createInitialState();
      fresh.account = {
        ...prev.account,
        initialized: true,
        baseCurrency: baseCurrency || prev.account.baseCurrency,
        startingCash: Number(startingCash ?? prev.account.startingCash),
        cashBalance: Number(startingCash ?? prev.account.startingCash),
        createdAt: new Date().toISOString(),
      };
      if (keepWatchlist) fresh.watchlist = prev.watchlist;
      if (keepLessons) {
        fresh.lessonProgress = prev.lessonProgress;
        fresh.learningEvents = prev.learningEvents;
      }
      return fresh;
    });
    setBannerNotice('Virtual account has been reset. Fresh start!');
  }, []);

  const updateSettings = useCallback((patch) => {
    setState((prev) => ({
      ...prev,
      account: { ...prev.account, ...patch },
    }));
  }, []);

  const restoreFromBackup = useCallback((parsedJson) => {
    if (!parsedJson || !parsedJson.account || !Array.isArray(parsedJson.orders)) {
      throw new Error('Invalid backup file format.');
    }
    const base = createInitialState();
    const merged = {
      ...base,
      ...parsedJson,
      account: { ...base.account, ...parsedJson.account, initialized: true },
      learningEvents: { ...base.learningEvents, ...(parsedJson.learningEvents || {}) },
    };
    setState(merged);
    setBannerNotice('Account restored from backup successfully.');
  }, []);

  const placeOrder = useCallback(
    ({ quote, sector, side, orderType, bucket, quantity, limitPrice, note }) => {
      const marketIsOpen = Boolean(marketStatus?.[quote.market]?.is_open);
      const result = createAndProcessOrder({
        state: stateRef.current,
        quote,
        sector,
        side,
        orderType,
        bucket,
        quantity,
        limitPrice,
        note,
        usdinr: usdinrRef.current,
        quotesMap: quotesRef.current,
        marketIsOpen,
      });

      if (!result.ok) {
        return result;
      }

      setState(result.nextState);
      setQuotesMap((prev) => ({ ...prev, [quote.symbol]: quote }));

      const reflection = buildPostTradeReflection({
        order: result.order,
        transaction: result.transaction,
        state: result.nextState,
        quotesMap: { ...quotesRef.current, [quote.symbol]: quote },
        usdinr: usdinrRef.current,
      });
      setPostTradeReflection({ ...reflection, statusMessage: result.message });

      return result;
    },
    [marketStatus]
  );

  const cancelOrder = useCallback((orderId) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && (o.status === 'OPEN' || o.status === 'QUEUED')
          ? { ...o, status: 'CANCELLED' }
          : o
      ),
    }));
  }, []);

  const toggleWatchlist = useCallback((stock) => {
    setState((prev) => {
      const sym = stock.symbol.toUpperCase();
      const exists = prev.watchlist.some((w) => w.symbol === sym);
      if (exists) {
        return { ...prev, watchlist: prev.watchlist.filter((w) => w.symbol !== sym) };
      }
      return {
        ...prev,
        watchlist: [
          {
            symbol: sym,
            name: stock.name || sym,
            market: stock.market || (sym.endsWith('.NS') || sym.endsWith('.BO') ? 'IN' : 'US'),
            currency: stock.currency || (sym.endsWith('.NS') || sym.endsWith('.BO') ? 'INR' : 'USD'),
            exchange: stock.exchange || '',
          },
          ...prev.watchlist,
        ],
      };
    });
  }, []);

  const markLessonRead = useCallback((lessonId) => {
    setState((prev) => ({
      ...prev,
      lessonProgress: {
        ...prev.lessonProgress,
        [lessonId]: { ...(prev.lessonProgress[lessonId] || {}), read: true },
      },
    }));
  }, []);

  const recordLearningEvent = useCallback((eventKey) => {
    setState((prev) => {
      if (prev.learningEvents?.[eventKey]) return prev;
      return {
        ...prev,
        learningEvents: { ...prev.learningEvents, [eventKey]: true },
      };
    });
  }, []);

  const value = {
    state,
    quotesMap,
    setQuotesMap,
    usdinr,
    marketStatus,
    benchmarks,
    portfolioSummary,
    syncingOrders,
    bannerNotice,
    clearBannerNotice: () => setBannerNotice(null),
    postTradeReflection,
    closePostTradeReflection: () => setPostTradeReflection(null),
    setupAccount,
    resetAccount,
    updateSettings,
    restoreFromBackup,
    placeOrder,
    cancelOrder,
    toggleWatchlist,
    markLessonRead,
    recordLearningEvent,
    refreshTrackedQuotes,
    refreshMarketMeta,
    syncPendingOrders,
  };

  return <TraderContext.Provider value={value}>{children}</TraderContext.Provider>;
}

export function useTrader() {
  return useContext(TraderContext);
}
