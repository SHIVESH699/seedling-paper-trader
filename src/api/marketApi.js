/**
 * Clean API client for the Vercel Python market data endpoints (/api/market/*).
 * Because all market calls go through this single module, switching endpoints
 * or adding authentication later requires editing only this file.
 */

async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.detail) message = err.detail;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message);
  }
  return res.json();
}

export const marketApi = {
  health: () => request('/api/health'),
  getStatus: () => request('/api/market/status'),
  getPopular: (market = '') =>
    request(`/api/market/popular${market ? `?market=${encodeURIComponent(market)}` : ''}`),
  search: (q, market = '') => {
    const params = new URLSearchParams({ q });
    if (market) params.set('market', market);
    return request(`/api/market/search?${params.toString()}`);
  },
  getQuote: (symbol, refresh = false) =>
    request(`/api/market/quote/${encodeURIComponent(symbol)}${refresh ? '?refresh=true' : ''}`),
  getBatchQuotes: (symbols) => {
    if (!symbols || symbols.length === 0) return Promise.resolve({ quotes: {} });
    const list = [...new Set(symbols.map((s) => s.toUpperCase()))].join(',');
    return request(`/api/market/quotes?symbols=${encodeURIComponent(list)}`);
  },
  getChart: (symbol, range = '1M') =>
    request(`/api/market/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`),
  getCandlesSince: (symbol, sinceIso) =>
    request(
      `/api/market/candles-since/${encodeURIComponent(symbol)}?since=${encodeURIComponent(sinceIso)}`
    ),
  getFundamentals: (symbol) =>
    request(`/api/market/fundamentals/${encodeURIComponent(symbol)}`),
  getFxRate: () => request('/api/market/fx/usdinr'),
  getBenchmarks: () => request('/api/market/benchmarks'),
};
