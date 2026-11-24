import React, { useMemo, useState } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { previewTrade } from '../engine/tradingEngine';
import { currencySymbol, formatMoney } from '../utils/format';
import InfoTooltip from './InfoTooltip';

export default function OrderTicket({ quote, fundamentals }) {
  const { state, quotesMap, usdinr, marketStatus, placeOrder } = useTrader();

  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('MARKET');
  const [bucket, setBucket] = useState('LONG_TERM');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState(() => (quote?.price ? String(quote.price) : ''));
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const marketInfo = marketStatus?.[quote.market];
  const marketIsOpen = Boolean(marketInfo?.is_open);

  const preview = useMemo(
    () =>
      previewTrade({
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
      }),
    [state, quote, side, orderType, bucket, quantity, limitPrice, usdinr, quotesMap, marketIsOpen]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const res = placeOrder({
      quote,
      sector: fundamentals?.sector || 'Unknown',
      side,
      orderType,
      bucket,
      quantity: Number(quantity),
      limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : null,
      note,
    });

    if (!res.ok) {
      setSubmitError(res.error);
      return;
    }

    setSubmitSuccess(res.message);
    setNote('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      {/* Buy / Sell Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-4">
        <button
          type="button"
          onClick={() => {
            setSide('BUY');
            setSubmitError('');
            setSubmitSuccess('');
          }}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${
            side === 'BUY'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            setSide('SELL');
            setSubmitError('');
            setSubmitSuccess('');
          }}
          className={`py-2 rounded-lg text-sm font-semibold transition-all ${
            side === 'SELL'
              ? 'bg-loss text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Market Hours Pill */}
      <div
        className={`mb-4 rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${
          marketIsOpen
            ? 'bg-brand/10 text-brand dark:bg-brand/15'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
        }`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>
          {marketInfo
            ? marketIsOpen
              ? `${marketInfo.exchanges} Open · ${marketInfo.session}`
              : `${marketInfo.reason} — orders will queue`
            : 'Checking market hours...'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bucket selector */}
        <div>
          <label className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Goal Bucket
            <InfoTooltip termKey="bucket" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'LONG_TERM', label: 'Long-term' },
              { id: 'TRADING', label: 'Trading' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBucket(b.id)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  bucket === b.id
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order Type selector */}
        <div>
          <label className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Order Type
            <InfoTooltip termKey="orderType" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'MARKET', label: 'Market' },
              { id: 'LIMIT', label: 'Limit' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setOrderType(t.id);
                  if (t.id === 'LIMIT' && !limitPrice) {
                    setLimitPrice(String(quote.price));
                  }
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  orderType === t.id
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Quantity {quote.market === 'IN' ? '(Whole shares)' : '(Shares)'}
            </label>
            {side === 'SELL' && (
              <span className="text-[11px] text-slate-500">
                Sellable: <strong className="text-slate-700 dark:text-slate-200">{preview.sellableQty}</strong>
              </span>
            )}
          </div>
          <input
            type="number"
            min={quote.market === 'IN' ? '1' : '0.01'}
            step={quote.market === 'IN' ? '1' : 'any'}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium focus:border-brand focus:outline-none"
          />
        </div>

        {/* Limit Price */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Limit Price ({currencySymbol(quote.currency)})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium focus:border-brand focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Current price: {formatMoney(quote.price, quote.currency)}.{' '}
              {side === 'BUY'
                ? 'Fills at this price or lower.'
                : 'Fills at this price or higher.'}
            </p>
          </div>
        )}

        {/* Thesis / Exit Plan Note */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Trade Thesis / Exit Plan <span className="text-slate-400 font-normal">(recommended)</span>
          </label>
          <input
            type="text"
            maxLength={220}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              bucket === 'LONG_TERM'
                ? 'e.g. Strong ROE, holding 3+ years unless margins fall'
                : 'e.g. Support bounce; exit -5% stop or +10% target'
            }
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs focus:border-brand focus:outline-none"
          />
        </div>

        {/* Cost Summary */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Stock value ({quote.currency})</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatMoney(preview.tradeNative, quote.currency)}
            </span>
          </div>

          {quote.currency !== state.account.baseCurrency && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>FX conversion (1 USD = ₹{usdinr.toFixed(2)})</span>
              <span>{formatMoney(preview.grossBase, state.account.baseCurrency)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span className="flex items-center">
              Brokerage fee ({state.account.brokerageEnabled ? 'ON' : 'OFF'})
              <InfoTooltip termKey="brokerage" />
            </span>
            <span>{formatMoney(preview.feeBase, state.account.baseCurrency)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
            <span>{side === 'BUY' ? 'Estimated Cost' : 'Estimated Proceeds'}</span>
            <span>{formatMoney(preview.netBase, state.account.baseCurrency)}</span>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Available virtual cash</span>
            <span>{formatMoney(preview.availableCash, state.account.baseCurrency)}</span>
          </div>
        </div>

        {/* Validation / Submission Feedback */}
        {(preview.error || submitError) && (
          <div className="rounded-xl bg-loss/10 border border-loss/20 px-3.5 py-2.5 text-xs text-loss flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError || preview.error}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="rounded-xl bg-brand/10 border border-brand/20 px-3.5 py-2.5 text-xs text-brand flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitSuccess}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!preview.canPlace}
          className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
            side === 'BUY'
              ? 'bg-brand hover:bg-brand-dark'
              : 'bg-loss hover:opacity-90'
          }`}
        >
          {side === 'BUY' ? 'Place Buy' : 'Place Sell'}{' '}
          {orderType === 'LIMIT' ? 'Limit Order' : marketIsOpen ? 'Market Order' : '(Queue for Open)'}
        </button>
      </form>
    </div>
  );
}
