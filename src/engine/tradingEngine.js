/**
 * Core Paper Trading & Portfolio Accounting Engine.
 *
 * Key guarantees:
 * 1. Native-currency holdings: Every holding stores quantity and avgBuyPrice strictly
 *    in the stock's native currency (INR for NSE/BSE, USD for NYSE/NASDAQ). FX conversion
 *    only occurs when debiting/crediting virtual cash or summing total portfolio value.
 * 2. Buying-power protection: Cash required for OPEN/QUEUED BUY orders is reserved so
 *    you can never accidentally over-commit virtual cash.
 * 3. Honest brokerage simulation: Toggleable realistic fees (₹20 + 0.05% for India,
 *    $1 + 0.05% for US) so beginners feel real transaction-cost drag.
 * 4. Offline limit-order backfill: Evaluates historical OHLC candles since order placement
 *    and fills chronologically at the gap-aware price & exact candle timestamp.
 * 5. Future corporate actions (v2): Ledger supports txType 'BUY' | 'SELL' | 'SPLIT' | 'DIVIDEND'.
 */

import { currencySymbol, todayDateKey } from '../utils/format';

export const STORAGE_KEY = 'seedling_paper_trader_v1';

export function createInitialState() {
  return {
    version: 1,
    account: {
      initialized: false,
      baseCurrency: 'INR',
      startingCash: 1000000,
      cashBalance: 1000000,
      brokerageEnabled: true,
      brokerageFlatInr: 20,
      brokerageFlatUsd: 1,
      brokeragePct: 0.0005, // 0.05% statutory/regulatory estimate
      createdAt: new Date().toISOString(),
    },
    holdings: [],      // { symbol, name, market, currency, sector, bucket, quantity, avgBuyPrice, firstBoughtAt, updatedAt }
    orders: [],        // { id, symbol, name, market, currency, sector, side, orderType, bucket, quantity, limitPrice, filledPrice, fxRateAtFill, feeInBase, status, rejectReason, note, createdAt, filledAt }
    transactions: [],  // { id, orderId, txType: 'BUY'|'SELL'|'SPLIT'|'DIVIDEND', symbol, name, market, currency, bucket, quantity, priceNative, totalNative, fxRate, feeInBase, totalInBase, realizedPnlNative, holdingDays, note, executedAt }
    watchlist: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', market: 'IN', currency: 'INR', exchange: 'NSE' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', market: 'IN', currency: 'INR', exchange: 'NSE' },
      { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', currency: 'USD', exchange: 'NASDAQ' },
    ],
    snapshots: [],     // { date, totalValueBase, cashBase, investedBase, niftyClose, sp500Close, usdinrRate }
    lessonProgress: {}, // { [lessonId]: { read: boolean } }
    learningEvents: {
      inspectedCandlestickLongRange: false,
      checkedBenchmarkWithFees: false,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      account: { ...base.account, ...(parsed.account || {}) },
      learningEvents: { ...base.learningEvents, ...(parsed.learningEvents || {}) },
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save state to localStorage:', err);
  }
}

export function fxMultiplier(stockCurrency, baseCurrency, usdinr) {
  if (stockCurrency === baseCurrency) return 1;
  if (stockCurrency === 'USD' && baseCurrency === 'INR') return usdinr;
  if (stockCurrency === 'INR' && baseCurrency === 'USD') return Number((1 / usdinr).toFixed(6));
  return 1;
}

export function calculateFeeInBase(account, stockCurrency, tradeValueNative, fx) {
  if (!account.brokerageEnabled) return 0;
  const flatNative =
    stockCurrency === 'INR' ? Number(account.brokerageFlatInr) : Number(account.brokerageFlatUsd);
  const pctNative = tradeValueNative * Number(account.brokeragePct);
  return Number(((flatNative + pctNative) * fx).toFixed(2));
}

export function calculateReservedCash(state, quotesMap, usdinr) {
  const pendingBuys = state.orders.filter(
    (o) => o.side === 'BUY' && (o.status === 'OPEN' || o.status === 'QUEUED')
  );
  let reserved = 0;
  for (const o of pendingBuys) {
    const refPrice =
      o.orderType === 'LIMIT' && o.limitPrice
        ? Number(o.limitPrice)
        : Number(quotesMap?.[o.symbol]?.price || o.referencePrice || 0);
    const tradeNative = Number(o.quantity) * refPrice;
    const fx = fxMultiplier(o.currency, state.account.baseCurrency, usdinr);
    const fee = calculateFeeInBase(state.account, o.currency, tradeNative, fx);
    reserved += Number((tradeNative * fx + fee).toFixed(2));
  }
  return Number(reserved.toFixed(2));
}

export function getLockedSellQty(orders, symbol, bucket, excludeOrderId = null) {
  return orders
    .filter(
      (o) =>
        o.symbol === symbol &&
        o.bucket === bucket &&
        o.side === 'SELL' &&
        (o.status === 'OPEN' || o.status === 'QUEUED') &&
        o.id !== excludeOrderId
    )
    .reduce((sum, o) => sum + Number(o.quantity), 0);
}

export function previewTrade({
  state,
  quote,
  side,
  orderType,
  bucket,
  quantity,
  limitPrice,
  usdinr,
  quotesMap,
  marketIsOpen,
}) {
  const qty = Number(quantity);
  const sym = quote.symbol.toUpperCase();
  const baseCurrency = state.account.baseCurrency;
  const refPrice = orderType === 'LIMIT' ? Number(limitPrice || 0) : Number(quote.price);
  const tradeNative = Number((qty * refPrice).toFixed(2));
  const fx = fxMultiplier(quote.currency, baseCurrency, usdinr);
  const feeBase = calculateFeeInBase(state.account, quote.currency, tradeNative, fx);
  const grossBase = Number((tradeNative * fx).toFixed(2));
  const netBase =
    side === 'BUY' ? Number((grossBase + feeBase).toFixed(2)) : Math.max(0, Number((grossBase - feeBase).toFixed(2)));

  const reservedCash = calculateReservedCash(state, quotesMap, usdinr);
  const availableCash = Math.max(0, Number((state.account.cashBalance - reservedCash).toFixed(2)));

  const holding = state.holdings.find((h) => h.symbol === sym && h.bucket === bucket);
  const ownedQty = holding ? Number(holding.quantity) : 0;
  const lockedSell = getLockedSellQty(state.orders, sym, bucket);
  const sellableQty = Math.max(0, ownedQty - lockedSell);

  let error = null;
  if (!qty || qty <= 0) {
    error = 'Enter a quantity greater than 0.';
  } else if (quote.market === 'IN' && !Number.isInteger(qty)) {
    error = 'Indian stocks (NSE/BSE) trade in whole shares only.';
  } else if (orderType === 'LIMIT' && (!limitPrice || Number(limitPrice) <= 0)) {
    error = 'Enter a valid limit price greater than 0.';
  } else if (side === 'BUY' && netBase > availableCash + 0.01) {
    const cSym = currencySymbol(baseCurrency);
    error = `You cannot afford this order. Estimated cost is ${cSym}${netBase.toLocaleString(
      baseCurrency === 'INR' ? 'en-IN' : 'en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )} (includes ${cSym}${feeBase.toFixed(2)} brokerage), but available cash is ${cSym}${availableCash.toLocaleString(
      baseCurrency === 'INR' ? 'en-IN' : 'en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}.`;
  } else if (side === 'SELL' && qty > sellableQty + 1e-6) {
    const otherBucket = bucket === 'LONG_TERM' ? 'TRADING' : 'LONG_TERM';
    const otherHolding = state.holdings.find((h) => h.symbol === sym && h.bucket === otherBucket);
    const hint =
      otherHolding && otherHolding.quantity > 0
        ? ` You do hold ${otherHolding.quantity} shares in your ${
            otherBucket === 'LONG_TERM' ? 'Long-term' : 'Trading'
          } bucket.`
        : '';
    error = `Not enough shares in your ${
      bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'
    } bucket. Available to sell: ${sellableQty}.${hint}`;
  }

  return {
    qty,
    refPrice,
    tradeNative,
    fx,
    feeBase,
    grossBase,
    netBase,
    reservedCash,
    availableCash,
    ownedQty,
    sellableQty,
    marketIsOpen,
    canPlace: !error,
    error,
  };
}

/**
 * Pure state transition that fills a single order at `fillPrice` and `fillTimeIso`.
 * Returns { nextState, filledOrder, transaction, rejected }.
 */
export function fillOrderInState(state, orderId, fillPrice, fillTimeIso, usdinr) {
  const idx = state.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { nextState: state, filledOrder: null, transaction: null, rejected: false };

  const order = state.orders[idx];
  if (order.status !== 'OPEN' && order.status !== 'QUEUED') {
    return { nextState: state, filledOrder: null, transaction: null, rejected: false };
  }

  const px = Number(Number(fillPrice).toFixed(2));
  const qty = Number(order.quantity);
  const totalNative = Number((qty * px).toFixed(2));
  const fx = fxMultiplier(order.currency, state.account.baseCurrency, usdinr);
  const feeBase = calculateFeeInBase(state.account, order.currency, totalNative, fx);
  const grossBase = Number((totalNative * fx).toFixed(2));

  const nextAccount = { ...state.account };
  const nextHoldings = state.holdings.map((h) => ({ ...h }));
  const nextOrders = state.orders.map((o) => ({ ...o }));
  let transaction = null;

  if (order.side === 'BUY') {
    const totalDebitBase = Number((grossBase + feeBase).toFixed(2));
    if (totalDebitBase > nextAccount.cashBalance + 0.01) {
      const cSym = currencySymbol(nextAccount.baseCurrency);
      nextOrders[idx] = {
        ...order,
        status: 'REJECTED',
        rejectReason: `Insufficient cash at fill time (needed ${cSym}${totalDebitBase.toFixed(
          2
        )}, had ${cSym}${nextAccount.cashBalance.toFixed(2)}).`,
      };
      return {
        nextState: { ...state, orders: nextOrders },
        filledOrder: nextOrders[idx],
        transaction: null,
        rejected: true,
      };
    }

    nextAccount.cashBalance = Math.max(0, Number((nextAccount.cashBalance - totalDebitBase).toFixed(2)));

    const hIdx = nextHoldings.findIndex(
      (h) => h.symbol === order.symbol && h.bucket === order.bucket
    );
    if (hIdx >= 0) {
      const prev = nextHoldings[hIdx];
      const newQty = Number((prev.quantity + qty).toFixed(6));
      const newAvg = Number(
        (((prev.quantity * prev.avgBuyPrice) + (qty * px)) / newQty).toFixed(4)
      );
      nextHoldings[hIdx] = {
        ...prev,
        quantity: newQty,
        avgBuyPrice: newAvg,
        sector: order.sector && order.sector !== 'Unknown' ? order.sector : prev.sector,
        updatedAt: fillTimeIso,
      };
    } else {
      nextHoldings.push({
        symbol: order.symbol,
        name: order.name,
        market: order.market,
        currency: order.currency,
        sector: order.sector || 'Unknown',
        bucket: order.bucket,
        quantity: qty,
        avgBuyPrice: px,
        firstBoughtAt: fillTimeIso,
        updatedAt: fillTimeIso,
      });
    }

    transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      orderId: order.id,
      txType: 'BUY',
      symbol: order.symbol,
      name: order.name,
      market: order.market,
      currency: order.currency,
      bucket: order.bucket,
      quantity: qty,
      priceNative: px,
      totalNative,
      fxRate: fx,
      feeInBase: feeBase,
      totalInBase: totalDebitBase,
      realizedPnlNative: null,
      holdingDays: null,
      note: order.note || '',
      executedAt: fillTimeIso,
    };
  } else {
    // SELL
    const hIdx = nextHoldings.findIndex(
      (h) => h.symbol === order.symbol && h.bucket === order.bucket
    );
    if (hIdx === -1 || nextHoldings[hIdx].quantity + 1e-6 < qty) {
      nextOrders[idx] = {
        ...order,
        status: 'REJECTED',
        rejectReason: `Insufficient shares in ${order.bucket} bucket at fill time.`,
      };
      return {
        nextState: { ...state, orders: nextOrders },
        filledOrder: nextOrders[idx],
        transaction: null,
        rejected: true,
      };
    }

    const holding = nextHoldings[hIdx];
    const realizedPnlNative = Number(((px - holding.avgBuyPrice) * qty).toFixed(2));
    const holdingMs = Math.max(
      0,
      new Date(fillTimeIso).getTime() - new Date(holding.firstBoughtAt).getTime()
    );
    const holdingDays = Number((holdingMs / (1000 * 60 * 60 * 24)).toFixed(2));
    const netCreditBase = Math.max(0, Number((grossBase - feeBase).toFixed(2)));

    nextAccount.cashBalance = Number((nextAccount.cashBalance + netCreditBase).toFixed(2));

    const remainingQty = Number((holding.quantity - qty).toFixed(6));
    if (remainingQty <= 1e-6) {
      nextHoldings.splice(hIdx, 1);
    } else {
      nextHoldings[hIdx] = {
        ...holding,
        quantity: remainingQty,
        updatedAt: fillTimeIso,
      };
    }

    transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      orderId: order.id,
      txType: 'SELL',
      symbol: order.symbol,
      name: order.name,
      market: order.market,
      currency: order.currency,
      bucket: order.bucket,
      quantity: qty,
      priceNative: px,
      totalNative,
      fxRate: fx,
      feeInBase: feeBase,
      totalInBase: netCreditBase,
      realizedPnlNative,
      holdingDays,
      note: order.note || '',
      executedAt: fillTimeIso,
    };
  }

  nextOrders[idx] = {
    ...order,
    status: 'FILLED',
    filledPrice: px,
    fxRateAtFill: fx,
    feeInBase: feeBase,
    filledAt: fillTimeIso,
  };

  return {
    nextState: {
      ...state,
      account: nextAccount,
      holdings: nextHoldings,
      orders: nextOrders,
      transactions: [transaction, ...state.transactions],
    },
    filledOrder: nextOrders[idx],
    transaction,
    rejected: false,
  };
}

export function createAndProcessOrder({
  state,
  quote,
  sector,
  side,
  orderType,
  bucket,
  quantity,
  limitPrice,
  note,
  usdinr,
  quotesMap,
  marketIsOpen,
}) {
  const preview = previewTrade({
    state,
    quote,
    side,
    orderType,
    bucket,
    quantity,
    limitPrice,
    usdinr,
    quotesMap,
    marketIsOpen,
  });

  if (!preview.canPlace) {
    return { ok: false, error: preview.error };
  }

  const nowIso = new Date().toISOString();
  const initialStatus = orderType === 'MARKET' && !marketIsOpen ? 'QUEUED' : 'OPEN';
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newOrder = {
    id: orderId,
    symbol: quote.symbol.toUpperCase(),
    name: quote.name,
    market: quote.market,
    currency: quote.currency,
    sector: sector || 'Unknown',
    side,
    orderType,
    bucket,
    quantity: preview.qty,
    referencePrice: quote.price,
    limitPrice: orderType === 'LIMIT' ? Number(Number(limitPrice).toFixed(2)) : null,
    filledPrice: null,
    fxRateAtFill: 1,
    feeInBase: 0,
    status: initialStatus,
    rejectReason: null,
    note: (note || '').trim(),
    createdAt: nowIso,
    filledAt: null,
  };

  let workingState = {
    ...state,
    orders: [newOrder, ...state.orders],
  };

  let shouldFillNow = false;
  if (marketIsOpen) {
    if (orderType === 'MARKET') {
      shouldFillNow = true;
    } else if (orderType === 'LIMIT') {
      if (side === 'BUY' && quote.price <= newOrder.limitPrice) shouldFillNow = true;
      if (side === 'SELL' && quote.price >= newOrder.limitPrice) shouldFillNow = true;
    }
  }

  let finalOrder = newOrder;
  let transaction = null;
  let message = '';

  if (shouldFillNow) {
    const res = fillOrderInState(workingState, orderId, quote.price, nowIso, usdinr);
    workingState = res.nextState;
    finalOrder = res.filledOrder;
    transaction = res.transaction;
    message = `Order filled at ${currencySymbol(quote.currency)}${finalOrder.filledPrice.toFixed(2)}.`;
  } else if (initialStatus === 'QUEUED') {
    message = 'Market is currently closed. Order queued and will fill automatically when the market opens.';
  } else {
    message = marketIsOpen
      ? `Limit order is OPEN at ${currencySymbol(quote.currency)}${newOrder.limitPrice.toFixed(2)}.`
      : `Market is closed. Limit order saved as OPEN and will monitor prices once trading resumes.`;
  }

  return {
    ok: true,
    nextState: workingState,
    order: finalOrder,
    transaction,
    message,
  };
}

/**
 * Evaluates a single pending order against historical OHLC candles since `createdAt`.
 * Returns { triggerPrice, triggerTime } or null if not yet triggered.
 */
export function evaluateOrderAgainstCandles(order, candles) {
  if (!candles || candles.length === 0) return null;

  if (order.orderType === 'LIMIT' && order.limitPrice != null) {
    const lp = Number(order.limitPrice);
    for (const c of candles) {
      if (order.side === 'BUY' && c.low <= lp) {
        // Gap-aware fill: if market opened below our limit, fill at candle open; else at limit price
        return {
          triggerPrice: c.open <= lp ? c.open : lp,
          triggerTime: c.iso_time,
        };
      }
      if (order.side === 'SELL' && c.high >= lp) {
        return {
          triggerPrice: c.open >= lp ? c.open : lp,
          triggerTime: c.iso_time,
        };
      }
    }
    return null;
  }

  if (order.orderType === 'MARKET' && order.status === 'QUEUED') {
    // First session candle after order was queued
    return {
      triggerPrice: candles[0].open,
      triggerTime: candles[0].iso_time,
    };
  }

  return null;
}

/**
 * Computes enriched holdings (strictly native-currency P&L) and FX-converted portfolio totals.
 */
export function computePortfolioSummary(state, quotesMap, usdinr) {
  const baseCurrency = state.account.baseCurrency;
  let totalInvestedBase = 0;
  let totalMarketValueBase = 0;
  let hasForeignHoldings = false;

  const enrichedHoldings = state.holdings.map((h) => {
    const q = quotesMap?.[h.symbol];
    const currentPrice = q ? Number(q.price) : Number(h.avgBuyPrice);
    const investedNative = Number((h.quantity * h.avgBuyPrice).toFixed(2));
    const currentValueNative = Number((h.quantity * currentPrice).toFixed(2));
    const pnlNative = Number((currentValueNative - investedNative).toFixed(2));
    const pnlPct = investedNative > 0 ? Number(((pnlNative / investedNative) * 100).toFixed(2)) : 0;

    if (h.currency !== baseCurrency) hasForeignHoldings = true;
    const fx = fxMultiplier(h.currency, baseCurrency, usdinr);
    const investedBase = Number((investedNative * fx).toFixed(2));
    const currentValueBase = Number((currentValueNative * fx).toFixed(2));

    totalInvestedBase += investedBase;
    totalMarketValueBase += currentValueBase;

    return {
      ...h,
      currentPrice,
      investedNative,
      currentValueNative,
      pnlNative,
      pnlPct,
      investedBase,
      currentValueBase,
      delayLabel: q?.delay_label || 'Saved',
      isDelayed: q ? q.is_delayed : true,
    };
  });

  const reservedCash = calculateReservedCash(state, quotesMap, usdinr);
  const cashBalance = Number(state.account.cashBalance.toFixed(2));
  const availableCash = Math.max(0, Number((cashBalance - reservedCash).toFixed(2)));
  const totalPortfolioBase = Number((cashBalance + totalMarketValueBase).toFixed(2));
  const totalPnlBase = Number((totalPortfolioBase - state.account.startingCash).toFixed(2));
  const totalPnlPct =
    state.account.startingCash > 0
      ? Number(((totalPnlBase / state.account.startingCash) * 100).toFixed(2))
      : 0;

  return {
    baseCurrency,
    startingCash: state.account.startingCash,
    cashBalance,
    reservedCash,
    availableCash,
    totalInvestedBase: Number(totalInvestedBase.toFixed(2)),
    totalMarketValueBase: Number(totalMarketValueBase.toFixed(2)),
    totalPortfolioBase,
    totalPnlBase,
    totalPnlPct,
    hasForeignHoldings,
    usdinr,
    holdings: enrichedHoldings,
  };
}

export function upsertTodaySnapshot(state, summary, benchmarks) {
  const dateKey = todayDateKey();
  const snap = {
    date: dateKey,
    totalValueBase: summary.totalPortfolioBase,
    cashBase: summary.cashBalance,
    investedBase: summary.totalMarketValueBase,
    niftyClose: benchmarks?.nifty_50?.price || null,
    sp500Close: benchmarks?.sp_500?.price || null,
    usdinrRate: summary.usdinr,
  };

  const existingIdx = state.snapshots.findIndex((s) => s.date === dateKey);
  const nextSnaps = [...state.snapshots];
  if (existingIdx >= 0) {
    nextSnaps[existingIdx] = {
      ...nextSnaps[existingIdx],
      ...snap,
      niftyClose: snap.niftyClose ?? nextSnaps[existingIdx].niftyClose,
      sp500Close: snap.sp500Close ?? nextSnaps[existingIdx].sp500Close,
    };
  } else {
    nextSnaps.push(snap);
  }
  return { ...state, snapshots: nextSnaps };
}
