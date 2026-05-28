/**
 * TimeSeriesTable
 * Renders a financial schedule grid (rows × FY columns).
 *
 * Props:
 *   rows:    Array of { key, label, isSectionHeader, isSubtotal, isTotal, format }
 *   fys:     Array of FY strings e.g. ['FY2027', ..., 'FY2041']
 *   data:    Object { [key]: { [FY]: number } }
 *   highlight: optional FY to highlight
 */

import { useModelStore } from '../../store';

const fmt = (val, format = 'number') => {
  if (val === null || val === undefined || val === '') return '—';
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return val;

  if (format === 'pct')    return `${n.toFixed(1)}%`;
  if (format === 'x')      return `${n.toFixed(2)}x`;
  if (format === 'bool')   return n ? 'Yes' : 'No';
  if (format === 'year')   return String(n);

  // Default: number with 1 decimal, grouped
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}${(abs).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return `${sign}${abs.toFixed(1)}`;
};

const colorClass = (val, format, key) => {
  if (!val || typeof val !== 'number') return '';
  if (format === 'pct' || format === 'x') return val > 0 ? 'positive' : val < 0 ? 'negative' : '';
  // For financial lines, negatives are typically ok (losses, outflows)
  return '';
};

export function TimeSeriesTable({ rows, fys, data, highlightFy }) {
  if (!fys || !data) return null;

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Line Item</th>
            {fys.map((fy) => (
              <th key={fy} style={fy === highlightFy ? { color: 'var(--gold)' } : {}}>
                {fy}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.isSectionHeader) {
              return (
                <tr key={i} className="section-header">
                  <td colSpan={fys.length + 1}>{row.label}</td>
                </tr>
              );
            }

            const rowData = data[row.key] || {};
            const cls = row.isTotal ? 'total' : row.isSubtotal ? 'subtotal' : '';

            return (
              <tr key={i} className={cls}>
                <td style={{ paddingLeft: row.indent ? `${1.5 + row.indent * 0.75}rem` : undefined }}>
                  {row.label}
                </td>
                {fys.map((fy) => {
                  const val = rowData[fy];
                  const n = typeof val === 'number' ? val : parseFloat(val);
                  const cc = colorClass(n, row.format);
                  return (
                    <td
                      key={fy}
                      className={cc}
                      style={fy === highlightFy ? { background: 'var(--gold-glow)' } : {}}
                    >
                      {fmt(val, row.format)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Phase-aware FY filter ─────────────────────────────────────────────────

export function FyToggle({ value, onChange, fys, constructionFys, operationsFys }) {
  return (
    <div className="tabs" style={{ marginBottom: 0 }}>
      {[
        { key: 'all',          label: 'All Years' },
        { key: 'construction', label: 'Construction' },
        { key: 'operations',   label: 'Operations' },
      ].map((t) => (
        <button
          key={t.key}
          className={`tab${value === t.key ? ' active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function useFyFilter(output) {
  const [phase, setPhase] = React.useState('all');
  if (!output) return { phase, setPhase, visibleFys: [] };

  const allFys  = output.meta.fy_range;
  const conFys  = output.meta.construction_fys;
  const opsFys  = output.meta.operations_fys;

  const visibleFys =
    phase === 'construction' ? conFys :
    phase === 'operations'   ? opsFys : allFys;

  return { phase, setPhase, visibleFys, allFys, conFys, opsFys };
}

import React from 'react';
