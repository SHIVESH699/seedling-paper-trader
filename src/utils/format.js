/**
 * Currency, percentage, market cap, and date formatters.
 * Uses Indian numbering (en-IN: ₹10,00,000) for INR and US numbering (en-US: $10,000) for USD.
 */

export function currencySymbol(currency) {
  return currency === 'INR' ? '₹' : '$';
}

export function formatMoney(value, currency = 'INR', decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const abs = Math.abs(num);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formatted = abs.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = num < 0 ? '-' : '';
  return `${sign}${currencySymbol(currency)}${formatted}`;
}

export function formatSignedMoney(value, currency = 'INR', decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${formatMoney(num, currency, decimals)}`;
}

export function formatPercent(value, showSign = true) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const prefix = showSign && num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}

export function formatMarketCap(value, currency = 'INR') {
  if (!value || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  if (currency === 'INR') {
    const crores = num / 1e7; // 1 Crore = 10,000,000
    if (crores >= 100000) {
      return `₹${(crores / 100000).toFixed(2)}L Cr`;
    }
    return `₹${Math.round(crores).toLocaleString('en-IN')} Cr`;
  }
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoOrDate) {
  if (!isoOrDate) return '—';
  try {
    const d = new Date(isoOrDate);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  } catch {
    return isoOrDate;
  }
}

export function todayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
