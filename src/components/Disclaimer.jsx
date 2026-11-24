import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Disclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        Simulator only — uses virtual money for educational practice. Past virtual performance does
        not predict real market results.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
      <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong className="font-medium text-slate-700 dark:text-slate-300">Simulator Disclaimer:</strong>{' '}
        This is a paper trading simulator built for learning and long-term investing practice. No real
        money is at risk, free market quotes may be delayed, and past virtual performance does not
        predict real-world results.
      </p>
    </div>
  );
}
