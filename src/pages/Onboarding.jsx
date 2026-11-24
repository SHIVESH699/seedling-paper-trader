import React, { useState } from 'react';
import { Sprout, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import Disclaimer from '../components/Disclaimer';

export default function Onboarding() {
  const { setupAccount } = useTrader();
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('1000000');
  const [brokerageEnabled, setBrokerageEnabled] = useState(true);
  const [error, setError] = useState('');

  const handleStart = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Please enter a virtual starting amount greater than zero.');
      return;
    }
    setupAccount({
      baseCurrency: currency,
      startingCash: num,
      brokerageEnabled,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand/15 text-brand flex items-center justify-center mx-auto">
            <Sprout className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to Seedling
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Practice calm long-term investing and trading across Indian (NSE/BSE) and US
            (NYSE/NASDAQ) stocks with virtual money.
          </p>
        </div>

        <form
          onSubmit={handleStart}
          className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Quick Start Options
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrency('INR');
                  setAmount('1000000');
                  setError('');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  currency === 'INR' && amount === '1000000'
                    ? 'border-brand bg-brand/10 ring-1 ring-brand/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  India Default
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  ₹10,00,000
                </p>
                <span className="text-[11px] text-slate-400">10 Lakh Rupees</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrency('USD');
                  setAmount('10000');
                  setError('');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  currency === 'USD' && amount === '10000'
                    ? 'border-brand bg-brand/10 ring-1 ring-brand/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  US Default
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  $10,000
                </p>
                <span className="text-[11px] text-slate-400">US Dollars</span>
              </button>
            </div>
          </div>

          {/* Custom Currency & Amount */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Or Enter Any Custom Starting Cash
            </label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-3 text-sm font-semibold focus:border-brand focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="Type any amount..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-base font-semibold focus:border-brand focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400">
              You can invest in both Indian and US stocks regardless of your base currency. You can
              reset your account anytime in Settings.
            </p>
          </div>

          {/* Brokerage Setting */}
          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={brokerageEnabled}
              onChange={(e) => setBrokerageEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-[#00B386]"
            />
            <div className="text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                Include realistic brokerage fees (Recommended)
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Adds ₹20 + 0.05% on Indian trades and $1 + 0.05% on US trades so you experience real
                transaction costs. Toggleable anytime.
              </p>
            </div>
          </label>

          {error && <p className="text-xs text-loss font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Start Paper Trading
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <Disclaimer />
      </div>
    </div>
  );
}
