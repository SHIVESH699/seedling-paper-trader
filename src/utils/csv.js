/**
 * Transaction History CSV export and full-account JSON backup/restore helpers.
 */

function escapeCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsCsv(transactions, baseCurrency) {
  const headers = [
    'Date (UTC)',
    'Type',
    'Symbol',
    'Company',
    'Market',
    'Bucket',
    'Quantity',
    'Price (Native)',
    'Stock Currency',
    'Total (Native)',
    'FX Rate to Base',
    `Brokerage Fee (${baseCurrency})`,
    `Net Total (${baseCurrency})`,
    'Realized P&L (Native)',
    'Note',
  ];

  const rows = transactions.map((tx) => [
    tx.executedAt,
    tx.txType,
    tx.symbol,
    tx.name,
    tx.market,
    tx.bucket,
    tx.quantity,
    tx.priceNative,
    tx.currency,
    tx.totalNative,
    tx.fxRate,
    tx.feeInBase,
    tx.totalInBase,
    tx.realizedPnlNative ?? '',
    tx.note ?? '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `seedling-transactions-${datePart}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBackupJson(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const datePart = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `seedling-backup-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
