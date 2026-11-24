import React, { useState } from 'react';
import { Download, RefreshCw, XCircle } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { exportTransactionsCsv } from '../utils/csv';
import { formatDateTime, formatMoney, formatSignedMoney } from '../utils/format';

export default function Orders({ onSelectStock }) {
  const { state, cancelOrder, syncPendingOrders, syncingOrders } = useTrader();
  const [subTab, setSubTab] = useState('PENDING'); // 'PENDING' | 'HISTORY'

  const pendingOrders = state.orders.filter(
    (o) => o.status === 'OPEN' || o.status === 'QUEUED'
  );
  const allOrders = state.orders;
  const transactions = state.transactions;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Orders &amp; History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pending limit &amp; after-hours orders backfill automatically from historical candles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => syncPendingOrders(false)}
            disabled={syncingOrders}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingOrders ? 'animate-spin' : ''}`} />
            Sync Pending
          </button>

          <button
            type="button"
            disabled={transactions.length === 0}
            onClick={() => exportTransactionsCsv(transactions, state.account.baseCurrency)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setSubTab('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'PENDING'
              ? 'bg-brand text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Open &amp; Queued ({pendingOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'HISTORY'
              ? 'bg-brand text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Transaction Ledger ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ALL_ORDERS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            subTab === 'ALL_ORDERS'
              ? 'bg-brand text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          All Orders ({allOrders.length})
        </button>
      </div>

      {/* Pending Orders View */}
      {subTab === 'PENDING' && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {pendingOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No open limit orders or queued after-hours orders right now.
            </div>
          ) : (
            pendingOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        o.side === 'BUY' ? 'bg-brand/15 text-brand' : 'bg-loss/15 text-loss'
                      }`}
                    >
                      {o.side}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectStock(o.symbol)}
                      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-brand"
                    >
                      {o.symbol}
                    </button>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {o.quantity} shares · {o.orderType}{' '}
                    {o.limitPrice ? `@ ${formatMoney(o.limitPrice, o.currency)}` : 'at next open'} ·{' '}
                    {o.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'}
                  </p>
                  {o.note && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">“{o.note}”</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Placed {formatDateTime(o.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => cancelOrder(o.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-loss/30 text-loss text-xs font-medium hover:bg-loss/10"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transaction History Ledger */}
      {subTab === 'HISTORY' && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No completed transactions yet. Filled orders appear here and can be exported to CSV.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-400 font-medium">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Fill Price</th>
                    <th className="px-4 py-3 text-right">Fee ({state.account.baseCurrency})</th>
                    <th className="px-5 py-3 text-right">Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.executedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            tx.txType === 'BUY' ? 'bg-brand/15 text-brand' : 'bg-loss/15 text-loss'
                          }`}
                        >
                          {tx.txType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onSelectStock(tx.symbol)}
                          className="font-semibold text-slate-900 dark:text-white hover:text-brand"
                        >
                          {tx.symbol}
                        </button>
                        <p className="text-[11px] text-slate-400">
                          {tx.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">{tx.quantity}</td>
                      <td className="px-4 py-3.5 text-right">
                        {formatMoney(tx.priceNative, tx.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500">
                        {formatMoney(tx.feeInBase, state.account.baseCurrency)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold">
                        {tx.realizedPnlNative !== null && tx.realizedPnlNative !== undefined ? (
                          <span className={tx.realizedPnlNative >= 0 ? 'text-brand' : 'text-loss'}>
                            {formatSignedMoney(tx.realizedPnlNative, tx.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Orders Log */}
      {subTab === 'ALL_ORDERS' && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {allOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No orders placed yet.</div>
          ) : (
            allOrders.map((o) => (
              <div key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {o.side} {o.quantity} {o.symbol}
                  </span>{' '}
                  <span className="text-slate-400">
                    ({o.orderType} · {o.bucket === 'LONG_TERM' ? 'Long-term' : 'Trading'})
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(o.filledAt || o.createdAt)}
                    {o.rejectReason ? ` · ${o.rejectReason}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      o.status === 'FILLED'
                        ? 'bg-brand/15 text-brand'
                        : o.status === 'CANCELLED' || o.status === 'REJECTED'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {o.status}
                  </span>
                  {o.filledPrice && (
                    <p className="text-slate-600 dark:text-slate-300 mt-1 font-medium">
                      {formatMoney(o.filledPrice, o.currency)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
