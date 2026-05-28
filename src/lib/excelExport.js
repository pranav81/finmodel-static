/**
 * excelExport.js
 * Client-side Excel export using SheetJS (xlsx).
 * Generates a workbook with one sheet per financial statement.
 */

import * as XLSX from 'xlsx';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || (typeof v === 'number' && Math.abs(v) < 0.001)) ? '' : v;
const rnd = (v) => (v == null ? '' : Math.round(v * 100) / 100);

function makeHeader(title, fys, currency) {
  return [
    [title, '', ...fys.map(() => '')],
    ['', `(${currency})`, ...fys],
  ];
}

function sectionRow(label) {
  return { label, values: null, isSectionHeader: true };
}

function dataRow(label, dict, fys, negate = false) {
  return {
    label,
    values: fys.map((fy) => {
      const v = dict?.[fy];
      if (v == null) return '';
      return rnd(negate ? -v : v);
    }),
  };
}

function blankRow() {
  return { label: '', values: null };
}

// Convert rows to a 2D array for SheetJS
function rowsToArray(rows, fys) {
  return rows.map((row) => {
    if (row.isSectionHeader) return [row.label, ...fys.map(() => '')];
    if (row.values === null)  return ['', ...fys.map(() => '')];
    return [row.label, ...row.values];
  });
}

// Apply styles: bold section headers, number format for data cells
function applyStyles(ws, rows, headerRowCount, fys) {
  const totalRows = headerRowCount + rows.length;

  for (let r = headerRowCount; r < totalRows; r++) {
    const row = rows[r - headerRowCount];
    const cellAddr = XLSX.utils.encode_cell({ r, c: 0 });

    if (row.isSectionHeader) {
      if (!ws[cellAddr]) ws[cellAddr] = { v: row.label, t: 's' };
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'EFF6FF' } },
      };
    }

    // Number format for data columns
    if (row.values) {
      for (let c = 1; c <= fys.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && ws[addr].v !== '') {
          ws[addr].t = 'n';
          ws[addr].z = '#,##0.00';
        }
      }
    }
  }

  // Column widths
  ws['!cols'] = [
    { wch: 36 },
    ...fys.map(() => ({ wch: 11 })),
  ];
}

// ── Sheet builders ─────────────────────────────────────────────────────────

function buildIncomeStatement(output) {
  const fys  = output.meta.fy_range;
  const is   = output.income_statement;
  const cur  = output.meta.currency;

  const rows = [
    dataRow('Revenue',           is.revenue,         fys),
    dataRow('Total OpEx',        is.total_opex,       fys, true),
    sectionRow(''),
    dataRow('EBITDA',            is.ebitda,           fys),
    dataRow('Depreciation',      is.depreciation,     fys, true),
    dataRow('EBIT',              is.ebit,             fys),
    dataRow('Interest Expense',  is.interest_expense, fys, true),
    dataRow('PBT',               is.pbt,              fys),
    dataRow('Tax',               is.tax,              fys, true),
    sectionRow(''),
    dataRow('PAT',               is.pat,              fys),
    blankRow(),
    dataRow('EBITDA Margin %',   is.ebitda_margin_pct, fys),
  ];

  const header = makeHeader('Income Statement', fys, cur);
  const labelRow = ['Line Item', ...fys];
  const data = [...header, labelRow, ...rowsToArray(rows, fys)];

  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}

function buildBalanceSheet(output) {
  const fys = output.meta.fy_range;
  const bs  = output.balance_sheet;
  const cur = output.meta.currency;

  const rows = [
    sectionRow('ASSETS'),
    dataRow('Net Block',           bs.net_block,          fys),
    dataRow('CWIP',                bs.cwip,               fys),
    dataRow('MAT Credit Asset',    bs.mat_credit_asset,   fys),
    dataRow('Cash & Bank',         bs.cash,               fys),
    sectionRow(''),
    dataRow('Total Assets',        bs.total_assets,       fys),
    blankRow(),
    sectionRow('LIABILITIES & EQUITY'),
    dataRow('Share Capital',       bs.share_capital,      fys),
    dataRow('Retained Earnings',   bs.retained_earnings,  fys),
    dataRow('Long-Term Debt',      bs.long_term_debt,     fys),
    dataRow('Short-Term Debt',     bs.short_term_debt,    fys),
    sectionRow(''),
    dataRow('Total L+E',           bs.total_liabilities_equity, fys),
    blankRow(),
    dataRow('Balance Check (0=OK)', bs.bs_check,          fys),
  ];

  const header = makeHeader('Balance Sheet', fys, cur);
  const data = [...header, ['Line Item', ...fys], ...rowsToArray(rows, fys)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}

function buildCashFlow(output) {
  const fys = output.meta.fy_range;
  const cfs = output.cashflow;
  const cur = output.meta.currency;

  const rows = [
    sectionRow('OPERATING'),
    dataRow('EBITDA',             output.income_statement.ebitda, fys),
    dataRow('Tax Paid',           cfs.tax_paid,         fys, true),
    dataRow('Working Capital Chg',cfs.working_capital_change, fys),
    dataRow('CFO',                cfs.cfo,              fys),
    blankRow(),
    sectionRow('INVESTING'),
    dataRow('CAPEX',              cfs.capex_outflow,    fys, true),
    dataRow('CFI',                cfs.cfi,              fys),
    blankRow(),
    sectionRow('FINANCING'),
    dataRow('Equity Injection',   cfs.equity_injection, fys),
    dataRow('Debt Drawdown',      cfs.debt_drawdown,    fys),
    dataRow('Debt Repayment',     cfs.debt_repayment,   fys, true),
    dataRow('Interest Paid',      cfs.interest_paid,    fys, true),
    dataRow('Dividends Paid',     cfs.dividends_paid,   fys, true),
    dataRow('CFF',                cfs.cff,              fys),
    blankRow(),
    dataRow('Net Change in Cash', cfs.net_change_in_cash, fys),
    dataRow('Opening Cash',       cfs.opening_cash,     fys),
    dataRow('Closing Cash',       cfs.closing_cash,     fys),
  ];

  const header = makeHeader('Cash Flow Statement', fys, cur);
  const data = [...header, ['Line Item', ...fys], ...rowsToArray(rows, fys)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}

function buildMetrics(output) {
  const fys = output.meta.fy_range;
  const m   = output.metrics;
  const cur = output.meta.currency;

  // Summary block
  const summary = [
    ['Metric', 'Value'],
    ['Project IRR',    m.project_irr_pct != null ? `${m.project_irr_pct}%` : 'N/A'],
    ['Equity IRR',     m.equity_irr_pct  != null ? `${m.equity_irr_pct}%`  : 'N/A'],
    ['Project NPV',    m.project_npv     != null ? m.project_npv           : 'N/A'],
    ['Min DSCR',       m.min_dscr        != null ? `${m.min_dscr}x`        : 'N/A'],
    ['Payback Year',   m.payback_year    || 'N/A'],
    ['WACC',           m.wacc_used_pct   != null ? `${m.wacc_used_pct}%`   : 'N/A'],
    ['Peak Debt',      m.peak_debt       != null ? m.peak_debt             : 'N/A'],
    ['Active Scenario', output.meta.active_scenario || 'base'],
    [],
    ['Annual DSCR', ...fys],
    ['DSCR', ...fys.map((fy) => m.dscr?.[fy] != null ? rnd(m.dscr[fy]) : 'N/A')],
    [],
    ['Dividends Paid', ...fys],
    ['Amount', ...fys.map((fy) => rnd(m.dividends_paid?.[fy]))],
  ];

  const ws = XLSX.utils.aoa_to_sheet(summary);
  ws['!cols'] = [{ wch: 22 }, ...fys.map(() => ({ wch: 11 }))];
  return ws;
}

function buildTax(output) {
  const fys = output.meta.fy_range;
  const tax = output.tax;
  const is  = output.income_statement;
  const cur = output.meta.currency;

  const rows = [
    dataRow('PBT',                     is.pbt,                           fys),
    dataRow('Unabsorbed Dep Used',      tax.unabsorbed_dep_utilised,      fys, true),
    dataRow('BF Loss Used',             tax.bf_loss_utilised,             fys, true),
    sectionRow('Tax Charge'),
    dataRow('Normal Tax',               tax.normal_tax,                   fys),
    dataRow('MAT Charge',               tax.mat_charge,                   fys),
    dataRow('Tax Payable',              tax.tax_payable,                  fys),
    sectionRow('Loss Pools (closing)'),
    dataRow('Unabsorbed Dep Pool',      tax.unabsorbed_dep_balance,       fys),
    dataRow('Business Loss Pool',       tax.bf_loss_balance,              fys),
    sectionRow('MAT Credit'),
    dataRow('MAT Credit Created',       tax.mat_credit_created,           fys),
    dataRow('MAT Credit Utilised',      tax.mat_credit_utilised,          fys),
    dataRow('MAT Credit Asset',         tax.mat_credit_asset,             fys),
  ];

  const header = makeHeader('Tax Schedule', fys, cur);
  const data = [...header, ['Line Item', ...fys], ...rowsToArray(rows, fys)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}

function buildDebt(output) {
  const fys  = output.meta.fy_range;
  const debt = output.debt;
  const cur  = output.meta.currency;

  const rows = [
    dataRow('Drawdown',             debt.drawdown,             fys),
    dataRow('IDC',                  debt.idc,                  fys),
    dataRow('Opening Loan Balance', debt.opening_loan,         fys),
    dataRow('Closing Loan Balance', debt.closing_loan,         fys),
    blankRow(),
    dataRow('Interest Expense',     debt.interest_expense,     fys),
    dataRow('Principal Repayment',  debt.principal_repayment,  fys),
    dataRow('Total Debt Service',   debt.total_debt_service,   fys),
  ];

  const header = makeHeader('Debt Schedule', fys, cur);
  const data = [...header, ['Line Item', ...fys], ...rowsToArray(rows, fys)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}

function buildCapex(output) {
  const fys = output.meta.fy_range;
  const cap = output.capex;
  const cur = output.meta.currency;

  const rows = [
    dataRow('CAPEX Spend',              cap.total_capex,              fys),
    dataRow('CWIP (closing)',           cap.cwip,                     fys),
    sectionRow('CAPITALISATION'),
    dataRow('Gross Block',              cap.gross_block,              fys),
    sectionRow('DEPRECIATION (SLM)'),
    dataRow('Depreciation Charge',      cap.depreciation,             fys),
    dataRow('Accumulated Depreciation', cap.accumulated_depreciation, fys),
    sectionRow('NET BLOCK'),
    dataRow('Net Block (closing)',       cap.net_block,                fys),
  ];

  const header = makeHeader('CAPEX & Depreciation', fys, cur);
  const data = [...header, ['Line Item', ...fys], ...rowsToArray(rows, fys)];
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyStyles(ws, rows, 3, fys);
  return ws;
}



function buildParameters(input) {
  const assumptions = input?.assumptions || [];
  const data = [
    ['Parameters', '', '', ''],
    ['', '', '', ''],
    ['Key', 'Label', 'Value', 'Unit / Tag'],
    ...assumptions.map((a) => [a.key, a.label, a.value, `${a.unit || ''}${a.group ? ' [' + a.group + ']' : ''}`]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 28 }, { wch: 32 }, { wch: 14 }, { wch: 20 }];
  // Bold header
  ws['A1'] = { v: 'Parameters', t: 's', s: { font: { bold: true, sz: 13 } } };
  ws['A3'] = { v: 'Key',   t: 's', s: { font: { bold: true } } };
  ws['B3'] = { v: 'Label', t: 's', s: { font: { bold: true } } };
  ws['C3'] = { v: 'Value', t: 's', s: { font: { bold: true } } };
  ws['D3'] = { v: 'Unit / Tag', t: 's', s: { font: { bold: true } } };
  return ws;
}

function buildRevenueSchedule(output) {
  const fys     = output.meta.fy_range;
  const rev     = output.revenue;
  const cur     = output.meta.currency;
  if (!rev) return null;

  const byLine  = rev.revenue_by_line  || {};
  const meta    = rev.revenue_metadata || {};
  const total   = rev.revenue_total    || {};
  const lineIds = Object.keys(byLine);

  const header  = makeHeader('Revenue Schedule', fys, cur);
  const colHead = ['Line Item', 'Category', ...fys];
  const rows    = lineIds.map((id) => [
    meta[id]?.label    || id,
    meta[id]?.category || '',
    ...fys.map((fy) => rnd(byLine[id]?.[fy])),
  ]);
  const totalRow = ['Total Revenue', '', ...fys.map((fy) => rnd(total[fy]))];

  const ws = XLSX.utils.aoa_to_sheet([...header, colHead, ...rows, [], totalRow]);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, ...fys.map(() => ({ wch: 11 }))];
  return ws;
}

function buildCostSchedule(output) {
  const fys     = output.meta.fy_range;
  const costs   = output.costs;
  const cur     = output.meta.currency;
  if (!costs) return null;

  const byLine  = costs.cost_by_line    || {};
  const meta    = costs.cost_metadata   || {};
  const total   = costs.cost_total      || {};
  const lineIds = Object.keys(byLine);

  const header  = makeHeader('Cost Schedule', fys, cur);
  const colHead = ['Line Item', 'Category', ...fys];
  const rows    = lineIds.map((id) => [
    meta[id]?.label    || id,
    meta[id]?.category || '',
    ...fys.map((fy) => rnd(byLine[id]?.[fy])),
  ]);
  const totalRow = ['Total Costs', '', ...fys.map((fy) => rnd(total[fy]))];

  const ws = XLSX.utils.aoa_to_sheet([...header, colHead, ...rows, [], totalRow]);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, ...fys.map(() => ({ wch: 11 }))];
  return ws;
}

// Overwrite the main export function to include new sheets
export function exportToExcel(projectName, output, input) {
  if (!output) throw new Error('No computed output — run Save & Compute first');

  const wb = XLSX.utils.book_new();

  // Parameters first — most useful reference sheet
  if (input) {
    XLSX.utils.book_append_sheet(wb, buildParameters(input), 'Parameters');
  }

  XLSX.utils.book_append_sheet(wb, buildIncomeStatement(output), 'Income Statement');
  XLSX.utils.book_append_sheet(wb, buildBalanceSheet(output),    'Balance Sheet');
  XLSX.utils.book_append_sheet(wb, buildCashFlow(output),        'Cash Flow');

  const revSheet = buildRevenueSchedule(output);
  if (revSheet) XLSX.utils.book_append_sheet(wb, revSheet, 'Revenue Schedule');

  const costSheet = buildCostSchedule(output);
  if (costSheet) XLSX.utils.book_append_sheet(wb, costSheet, 'Cost Schedule');

  XLSX.utils.book_append_sheet(wb, buildTax(output),             'Tax Schedule');
  XLSX.utils.book_append_sheet(wb, buildDebt(output),            'Debt Schedule');
  XLSX.utils.book_append_sheet(wb, buildCapex(output),           'CAPEX');
  XLSX.utils.book_append_sheet(wb, buildMetrics(output),         'Metrics');

  const filename = `${(projectName || 'model').replace(/[^a-zA-Z0-9_\- ]/g, '')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
