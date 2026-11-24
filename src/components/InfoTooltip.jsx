import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { GLOSSARY } from '../engine/coachingEngine';

/**
 * Contextual plain-English ? icon that explains unfamiliar terms (P/E, Limit Order, etc.)
 * on click without cluttering the interface.
 */
export default function InfoTooltip({ termKey, title, body }) {
  const [open, setOpen] = useState(false);
  const entry = termKey ? GLOSSARY[termKey] : null;
  const heading = title || entry?.title || 'Info';
  const text = body || entry?.body || '';

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Explain ${heading}`}
        className="ml-1 text-slate-400 hover:text-brand transition-colors focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto bottom-20 sm:bottom-auto sm:top-6 z-50 sm:w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl text-left">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {heading}
              </h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
          </div>
        </>
      )}
    </span>
  );
}
