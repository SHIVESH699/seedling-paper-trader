import React, { useState } from 'react';
import {
  Compass,
  PieChart,
  ReceiptText,
  GraduationCap,
  Sun,
  Moon,
  Settings,
  Sprout,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTrader } from '../context/TraderContext';
import { formatMoney } from '../utils/format';
import SettingsModal from './SettingsModal';
import Disclaimer from './Disclaimer';

const NAV_ITEMS = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
];

export default function Layout({ activeTab, onNavigate, children }) {
  const { dark, toggleTheme } = useTheme();
  const {
    state,
    portfolioSummary,
    marketStatus,
    bannerNotice,
    clearBannerNotice,
  } = useTrader();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openOrdersCount = state.orders.filter(
    (o) => o.status === 'OPEN' || o.status === 'QUEUED'
  ).length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-slate-950">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-5 justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-2 mb-7">
            <div className="w-9 h-9 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Seedling
              </h1>
              <p className="text-[11px] text-slate-400">Paper Trading Simulator</p>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand/12 text-brand dark:bg-brand/15'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.id === 'orders' && openOrdersCount > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand/15 text-brand">
                      {openOrdersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Calm Account Pill */}
          <div className="mt-7 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 space-y-2">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Available Cash
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatMoney(portfolioSummary.availableCash, portfolioSummary.baseCurrency)}
            </p>
            {marketStatus && (
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>NSE / BSE</span>
                  <span className={marketStatus.IN?.is_open ? 'text-brand font-medium' : 'text-slate-400'}>
                    {marketStatus.IN?.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>NYSE / NASDAQ</span>
                  <span className={marketStatus.US?.is_open ? 'text-brand font-medium' : 'text-slate-400'}>
                    {marketStatus.US?.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {dark ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
          <Disclaimer compact />
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 dark:text-white block leading-tight">
              Seedling
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Cash: {formatMoney(portfolioSummary.availableCash, portfolioSummary.baseCurrency, 0)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {bannerNotice && (
            <div className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-3">
              <span>{bannerNotice}</span>
              <button
                type="button"
                onClick={clearBannerNotice}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {children}

          <div className="pt-4">
            <Disclaimer />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium mt-0.5">{item.label}</span>
                {item.id === 'orders' && openOrdersCount > 0 && (
                  <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
