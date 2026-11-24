import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Info } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { downloadBackupJson } from '../utils/csv';

export default function SettingsModal({ open, onClose }) {
  const { state, updateSettings, resetAccount, restoreFromBackup } = useTrader();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCurrency, setResetCurrency] = useState(state.account.baseCurrency);
  const [resetCash, setResetCash] = useState(String(state.account.startingCash));
  const [restoreMsg, setRestoreMsg] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      restoreFromBackup(JSON.parse(text));
      setRestoreMsg('Backup restored!');
      setTimeout(() => {
        setRestoreMsg('');
        onClose();
      }, 900);
    } catch (err) {
      setRestoreMsg(err.message || 'Could not read backup JSON.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Simulator Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Brokerage Toggle */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Realistic Brokerage Fees
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simulates ₹{state.account.brokerageFlatInr} + {(state.account.brokeragePct * 100).toFixed(2)}%
                on Indian orders and ${state.account.brokerageFlatUsd} +{' '}
                {(state.account.brokeragePct * 100).toFixed(2)}% on US orders.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.account.brokerageEnabled}
              onClick={() => updateSettings({ brokerageEnabled: !state.account.brokerageEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                state.account.brokerageEnabled ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                  state.account.brokerageEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Backup & Restore Progress
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your trades and lessons stay saved in this browser. Export a JSON backup anytime to
              move between your phone and laptop.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadBackupJson(state)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              Download Backup (.json)
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore Backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </div>
          {restoreMsg && <p className="text-xs text-brand font-medium">{restoreMsg}</p>}
        </div>

        {/* v1 Corporate Actions Note */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <p className="leading-relaxed">
            <strong className="text-slate-700 dark:text-slate-300">Note on Stock Splits & Dividends (v1):</strong>{' '}
            Splits and cash dividends are not auto-applied in v1 so accounting stays transparent while
            you learn. The transaction ledger already supports SPLIT and DIVIDEND entries for v2.
          </p>
        </div>

        {/* Reset Virtual Account */}
        <div className="rounded-xl border border-loss/30 bg-loss/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-loss">Reset Virtual Account</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Clears all holdings, orders, and transaction history and starts fresh.
              </p>
            </div>
            {!confirmReset && (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-loss text-white text-xs font-medium hover:opacity-90"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {confirmReset && (
            <div className="pt-3 border-t border-loss/20 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetCurrency('INR');
                    setResetCash('1000000');
                  }}
                  className={`py-2 rounded-xl border text-xs font-medium ${
                    resetCurrency === 'INR'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  INR (₹10,00,000)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetCurrency('USD');
                    setResetCash('10000');
                  }}
                  className={`py-2 rounded-xl border text-xs font-medium ${
                    resetCurrency === 'USD'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  USD ($10,000)
                </button>
              </div>
              <input
                type="number"
                min="1"
                value={resetCash}
                onChange={(e) => setResetCash(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                placeholder="Starting virtual cash"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (Number(resetCash) > 0) {
                      resetAccount({
                        baseCurrency: resetCurrency,
                        startingCash: Number(resetCash),
                      });
                      setConfirmReset(false);
                      onClose();
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-loss text-white text-xs font-semibold"
                >
                  Confirm Full Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
