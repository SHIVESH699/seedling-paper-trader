import React from 'react';
import { CheckCircle2, AlertTriangle, X, BookOpen } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { formatMoney } from '../utils/format';

/**
 * Calm educational reflection card shown after placing an order.
 * No confetti, no gamification — just honest feedback on habits and common beginner pitfalls.
 */
export default function PostTradeModal() {
  const { postTradeReflection, closePostTradeReflection } = useTrader();
  if (!postTradeReflection) return null;

  const { order, warnings, positives, statusMessage } = postTradeReflection;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Post-Trade Reflection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {order.side} {order.quantity} {order.symbol} ({order.orderType} ·{' '}
                {order.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePostTradeReflection}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 mb-4">
          {statusMessage}{' '}
          {order.filledPrice && (
            <span className="text-slate-500">
              Fill price: {formatMoney(order.filledPrice, order.currency)}.
            </span>
          )}
        </div>

        {positives.length > 0 && (
          <div className="space-y-2 mb-4">
            {positives.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-brand">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed text-slate-700 dark:text-slate-300">{p}</span>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2.5 mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Things to Watch Out For
            </p>
            {warnings.map((w, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      {w.title}
                    </p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      {w.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={closePostTradeReflection}
          className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
