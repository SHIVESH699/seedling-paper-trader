import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';

const RANGES = ['1D', '1W', '1M', '1Y', '5Y'];

export default function StockChart({
  candles,
  loading,
  range,
  onRangeChange,
  chartType,
  onChartTypeChange,
  positive = true,
}) {
  const containerRef = useRef(null);
  const { dark } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !candles || candles.length === 0) return;

    const lineColor = positive ? '#00B386' : '#EB5B3C';
    const areaTop = positive ? 'rgba(0, 179, 134, 0.22)' : 'rgba(235, 91, 60, 0.20)';
    const areaBottom = positive ? 'rgba(0, 179, 134, 0.00)' : 'rgba(235, 91, 60, 0.00)';

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: dark ? '#94A3B8' : '#64748B',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: dark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(226, 232, 240, 0.8)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: range === '1D' || range === '1W',
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { labelVisible: true },
        horzLine: { labelVisible: true },
      },
    });

    if (chartType === 'CANDLE') {
      const series = chart.addCandlestickSeries({
        upColor: '#00B386',
        downColor: '#EB5B3C',
        borderVisible: false,
        wickUpColor: '#00B386',
        wickDownColor: '#EB5B3C',
      });
      series.setData(
        candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      const series = chart.addAreaSeries({
        lineColor,
        topColor: areaTop,
        bottomColor: areaBottom,
        lineWidth: 2,
      });
      series.setData(candles.map((c) => ({ time: c.time, value: c.close })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, chartType, dark, positive, range]);

  return (
    <div>
      <div className="relative min-h-[300px] w-full">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
            Loading chart...
          </div>
        ) : !candles || candles.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
            Chart data is temporarily unavailable for this timeframe.
          </div>
        ) : (
          <div ref={containerRef} className="w-full" />
        )}
      </div>

      {/* Controls Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-brand/15 text-brand dark:bg-brand/20'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            type="button"
            onClick={() => onChartTypeChange('LINE')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              chartType === 'LINE'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange('CANDLE')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              chartType === 'CANDLE'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Candles
          </button>
        </div>
      </div>
    </div>
  );
}
