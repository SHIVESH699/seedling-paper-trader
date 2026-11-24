import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { useTrader } from '../context/TraderContext';
import { LESSONS, computeWeeklyReview } from '../engine/coachingEngine';
import { formatMoney } from '../utils/format';

export default function Learn() {
  const { state, quotesMap, usdinr, markLessonRead } = useTrader();
  const [openLessonId, setOpenLessonId] = useState(LESSONS[0].id);

  const weekly = useMemo(
    () => computeWeeklyReview(state, quotesMap, usdinr),
    [state, quotesMap, usdinr]
  );

  const completedCount = LESSONS.filter(
    (l) => l.checkTask(state) && state.lessonProgress?.[l.id]?.read
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Learn &amp; Review
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Practical investing lessons with real-company examples and an honest weekly mirror of your habits
        </p>
      </div>

      {/* Weekly Behaviour Summary Card */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Weekly Behaviour Summary
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">{weekly.statsScope}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
            <p className="text-[11px] text-slate-400">Win Rate</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {weekly.winRate !== null ? `${weekly.winRate}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400">
              {weekly.closedSellsCount} closed sell(s)
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
            <p className="text-[11px] text-slate-400">Avg Holding Period</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {weekly.avgHoldingDays !== null ? `${weekly.avgHoldingDays}d` : '—'}
            </p>
            <p className="text-[10px] text-slate-400">Across closed trades</p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
            <p className="text-[11px] text-slate-400">Biggest Loss</p>
            <p className="text-lg font-bold text-loss mt-0.5">
              {weekly.biggestLoss
                ? formatMoney(weekly.biggestLoss.amountNative, weekly.biggestLoss.currency)
                : 'None'}
            </p>
            <p className="text-[10px] text-slate-400">
              {weekly.biggestLoss ? weekly.biggestLoss.symbol : 'No closed losses'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5">
            <p className="text-[11px] text-slate-400">Trades / Fees (7d)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {weekly.tradesThisWeek}
            </p>
            <p className="text-[10px] text-slate-400">
              Fees: {formatMoney(weekly.totalFeesWeek, state.account.baseCurrency)}
            </p>
          </div>
        </div>

        {/* One Clear Suggestion */}
        <div className="rounded-xl bg-brand/10 border border-brand/20 p-4 flex items-start gap-3">
          <Lightbulb className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              One Suggestion for This Week
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {weekly.suggestion}
            </p>
          </div>
        </div>
      </section>

      {/* Beginner Path (7 Lessons) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Beginner Investing Path
          </h3>
          <span className="text-xs text-slate-400">
            {completedCount} of {LESSONS.length} completed
          </span>
        </div>

        <div className="space-y-3">
          {LESSONS.map((lesson) => {
            const isOpen = openLessonId === lesson.id;
            const taskDone = lesson.checkTask(state);
            const isRead = Boolean(state.lessonProgress?.[lesson.id]?.read);
            const allDone = taskDone && isRead;

            return (
              <div
                key={lesson.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenLessonId(isOpen ? null : lesson.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {allDone ? (
                        <CheckCircle2 className="w-5 h-5 text-brand" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">
                        Lesson {lesson.number} · {lesson.readTime}
                        {taskDone ? ' · Practice task done' : ''}
                      </p>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lesson.summary}
                      </p>
                    </div>
                  </div>

                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {lesson.sections.map((sec, i) => (
                      <div key={i} className="space-y-1">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {sec.heading}
                        </h5>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {sec.body}
                        </p>
                      </div>
                    ))}

                    {/* Practical In-App Task Box */}
                    <div
                      className={`rounded-xl p-4 border ${
                        taskDone
                          ? 'border-brand/30 bg-brand/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Practical Task (Auto-Checked)
                          </p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                            {lesson.taskLabel}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {lesson.taskHint}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            taskDone
                              ? 'bg-brand text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {taskDone ? 'Completed' : 'To Do'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => markLessonRead(lesson.id)}
                        disabled={isRead}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isRead
                            ? 'bg-brand/15 text-brand cursor-default'
                            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                        }`}
                      >
                        {isRead ? 'Marked as Read ✓' : 'Mark Lesson as Read'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
