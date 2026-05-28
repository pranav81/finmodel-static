import { useState } from 'react';
import { AppShell, Icon, Spinner } from '../components/ui';
import { TimeSeriesTable, FyToggle } from '../components/charts/TimeSeriesTable';
import { useModel } from '../hooks/useModel';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// ── Scenario bar + action buttons (shared across all output pages) ─────────

function OutputBar({ output, activeScenarioId, scenarios, onSwitchScenario, onDownload, isComputing }) {
  const activeScenario = scenarios?.find((s) => s.id === activeScenarioId);
  const noOverrides = activeScenario && activeScenarioId !== 'base'
    && (!activeScenario.overrides || activeScenario.overrides.length === 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {scenarios?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
          <div className="scenario-bar">
            {scenarios.map((s) => (
              <button
                key={s.id}
                className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
                onClick={() => onSwitchScenario(s.id)}
                disabled={isComputing}
                style={{ position: 'relative', minWidth: 80 }}
              >
                {isComputing && activeScenarioId === s.id
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Spinner size={11} />{s.label}</span>
                  : s.label}
              </button>
            ))}
          </div>
          {noOverrides && (
            <span style={{ fontSize: '0.67rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
              ⚠ No overrides set — identical to Base Case. Edit in Scenarios page.
            </span>
          )}
        </div>
      )}
      {output && (
        <button className="btn btn-secondary btn-sm" onClick={onDownload} disabled={isComputing}>
          <Icon name="download" size={13} /> Excel
        </button>
      )}
    </div>
  );
}

function NoOutput({ onCompute, isComputing }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
      <Icon name="play" size={48} style={{ color: 'var(--muted)', opacity: 0.3 }} />
      <h3 style={{ color: 'var(--text-2)' }}>No output yet</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Save and compute the model to see results here.</p>
      <button className="btn btn-primary" onClick={onCompute} disabled={isComputing}>
        {isComputing ? <Spinner size={15} /> : <><Icon name="play" size={15} /> Run Model</>}
      </button>
    </div>
  );
}

// ── Table row definitions ─────────────────────────────────────────────────

const IS_ROWS = [
  { key: 'revenue',           label: 'Revenue',              isSubtotal: true },
  { key: 'total_opex',        label: 'Total Operating Costs', indent: 1 },
  { key: 'ebitda',            label: 'EBITDA',               isTotal: true },
  { key: 'ebitda_margin_pct', label: 'EBITDA Margin',        format: 'pct', indent: 1 },
  { key: '_sep1', isSectionHeader: true, label: 'Profit Waterfall' },
  { key: 'depreciation',      label: 'Depreciation',         indent: 1 },
  { key: 'ebit',              label: 'EBIT',                 isSubtotal: true },
  { key: 'interest_expense',  label: 'Interest Expense',     indent: 1 },
  { key: 'pbt',               label: 'PBT',                  isSubtotal: true },
  { key: 'tax',               label: 'Tax',                  indent: 1 },
  { key: 'pat',               label: 'PAT',                  isTotal: true },
  { key: 'pat_margin_pct',    label: 'PAT Margin',           format: 'pct', indent: 1 },
];

const BS_ROWS = [
  { key: '_assets', isSectionHeader: true, label: 'ASSETS' },
  { key: 'gross_block',               label: 'Gross Block',              indent: 1 },
  { key: 'accumulated_depreciation',  label: 'Accumulated Depreciation', indent: 1 },
  { key: 'net_block',                 label: 'Net Block (Fixed Assets)',  isSubtotal: true, indent: 1 },
  { key: 'cwip',                      label: 'CWIP',                     indent: 1 },
  { key: 'mat_credit_asset',          label: 'MAT Credit Asset',         indent: 1 },
  { key: 'cash',                      label: 'Cash & Equivalents',       indent: 1 },
  { key: 'total_assets',              label: 'Total Assets',             isTotal: true },
  { key: '_equity', isSectionHeader: true, label: 'EQUITY & LIABILITIES' },
  { key: 'share_capital',             label: 'Share Capital',            indent: 1 },
  { key: 'retained_earnings',         label: 'Retained Earnings',        indent: 1 },
  { key: 'total_equity',              label: 'Total Equity',             isSubtotal: true },
  { key: 'long_term_debt',            label: 'Long-Term Debt',           indent: 1 },
  { key: 'current_portion_debt',      label: 'Current Portion of Debt',  indent: 1 },
  { key: 'total_liabilities_equity',  label: 'Total Liabilities & Equity', isTotal: true },
];

const CFS_ROWS = [
  { key: '_cfo', isSectionHeader: true, label: 'A — OPERATING ACTIVITIES' },
  { key: 'ebitda',           label: 'EBITDA',                indent: 1 },
  { key: 'tax_paid',         label: '(Less) Tax Paid',       indent: 1 },
  { key: 'cfo',              label: 'Net CFO',               isSubtotal: true },
  { key: '_cfi', isSectionHeader: true, label: 'B — INVESTING ACTIVITIES' },
  { key: 'capex_outflow',    label: 'CAPEX',                 indent: 1 },
  { key: 'cfi',              label: 'Net CFI',               isSubtotal: true },
  { key: '_cff', isSectionHeader: true, label: 'C — FINANCING ACTIVITIES' },
  { key: 'equity_injection',    label: 'Equity Injections',   indent: 1 },
  { key: 'debt_drawdown',       label: 'Debt Drawdowns',      indent: 1 },
  { key: 'interest_paid',       label: 'Interest Paid',       indent: 1 },
  { key: 'principal_repayment', label: 'Principal Repayment', indent: 1 },
  { key: 'dividends_paid',      label: 'Dividends Paid',      indent: 1 },
  { key: 'cff',                 label: 'Net CFF',             isSubtotal: true },
  { key: '_summary', isSectionHeader: true, label: 'D — CASH POSITION' },
  { key: 'net_change_in_cash',  label: 'Net Change in Cash',  indent: 1 },
  { key: 'opening_cash',        label: 'Opening Cash',        indent: 1 },
  { key: 'closing_cash',        label: 'Closing Cash',        isTotal: true },
];

// Tax schedule — shows the full MAT / normal tax breakdown year by year
function TaxSchedule({ output, fys }) {
  const tax = output.tax;
  const is  = output.income_statement;

  // Build a merged data object for TimeSeriesTable
  const data = {
    pbt:                      is.pbt,
    unabsorbed_dep_utilised:  tax.unabsorbed_dep_utilised,
    bf_loss_utilised:         tax.bf_loss_utilised,
    normal_tax:               tax.normal_tax,
    mat_charge:               tax.mat_charge,
    tax_payable:              tax.tax_payable,
    tax_paid:                 tax.tax_paid,
    unabsorbed_dep_balance:   tax.unabsorbed_dep_balance,
    bf_loss_balance:          tax.bf_loss_balance,
    mat_credit_created:       tax.mat_credit_created,
    mat_credit_utilised:      tax.mat_credit_utilised,
    mat_credit_asset:         tax.mat_credit_asset,
    is_mat_year: Object.fromEntries(
      Object.entries(tax.is_mat_year || {}).map(([fy, v]) => [fy, v ? 1 : 0])
    ),
  };

  const rows = [
    { key: '_basis', isSectionHeader: true, label: 'TAXABLE INCOME COMPUTATION' },
    { key: 'pbt',                     label: 'Profit Before Tax (PBT)',              isSubtotal: true },
    { key: 'unabsorbed_dep_utilised', label: '(Less) Unabsorbed Depreciation S/O',  indent: 1 },
    { key: 'bf_loss_utilised',        label: '(Less) Brought-Forward Business Loss', indent: 1 },
    { key: '_comp', isSectionHeader: true, label: 'TAX CHARGE' },
    { key: 'normal_tax',              label: 'Normal Tax  (net taxable × corp rate)', indent: 1 },
    { key: 'mat_charge',              label: 'MAT  (book profit × MAT rate)',          indent: 1 },
    { key: 'tax_payable',             label: 'Tax Payable  (higher of above)',          isTotal: true },
    { key: 'tax_paid',                label: 'Tax Paid',                               indent: 1 },
    { key: '_losses', isSectionHeader: true, label: 'LOSS CARRY-FORWARD POOLS (closing balance)' },
    { key: 'unabsorbed_dep_balance',  label: 'Unabsorbed Depreciation Pool',           indent: 1 },
    { key: 'bf_loss_balance',         label: 'Business Loss Pool  (8-yr limit)',        indent: 1 },
    { key: '_mat', isSectionHeader: true, label: 'MAT CREDIT MECHANISM' },
    { key: 'mat_credit_created',      label: 'MAT Credit Created this year',            indent: 1 },
    { key: 'mat_credit_utilised',     label: 'MAT Credit Utilised this year',            indent: 1 },
    { key: 'mat_credit_asset',        label: 'MAT Credit Asset (closing)',               isSubtotal: true },
    { key: '_flag', isSectionHeader: true, label: 'MAT YEAR FLAG' },
    { key: 'is_mat_year',             label: 'MAT Year?  (1 = yes)',                     format: 'bool' },
  ];

  return (
    <div>
      {/* Summary note */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '0.85rem 1.1rem',
        marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--text-3)',
        display: 'flex', gap: '2rem', flexWrap: 'wrap',
      }}>
        <span>
          <span style={{ color: 'var(--text-2)' }}>Corporate Tax Rate:</span>{' '}
          {(output.meta?.tax_rate_pct ?? (output.tax ? '25.17' : '—'))}%
        </span>
        <span>
          <span style={{ color: 'var(--text-2)' }}>MAT Rate:</span>{' '}
          {output.meta?.mat_rate_pct ?? '15.0'}%
        </span>
        <span style={{ color: 'var(--gold)' }}>
          Tax Payable = max(Normal Tax, MAT).  MAT credit carried forward up to 15 years.
        </span>
      </div>

      <div className="card">
        <TimeSeriesTable rows={rows} fys={fys} data={data} />
      </div>
    </div>
  );
}

// ── Financial Statements Page ─────────────────────────────────────────────

export function FinancialsPage() {
  const { output, input, isComputing, activeScenarioId, switchScenario, compute, downloadExcel } = useModel();
  const [tab, setTab]     = useState('is');
  const [phase, setPhase] = useState('all');

  const allActions = (
    <OutputBar
      output={output} activeScenarioId={activeScenarioId}
      scenarios={input?.scenarios} onSwitchScenario={switchScenario}
      onDownload={downloadExcel} isComputing={isComputing}
    />
  );

  if (!output) return (
    <AppShell title="Financial Statements" actions={allActions}>
      <NoOutput onCompute={compute} isComputing={isComputing} />
    </AppShell>
  );

  const allFys = output.meta.fy_range;
  const conFys = output.meta.construction_fys;
  const opsFys = output.meta.operations_fys;
  const visibleFys = phase === 'construction' ? conFys : phase === 'operations' ? opsFys : allFys;

  const TABS = [
    { key: 'is',  label: 'Income Statement' },
    { key: 'bs',  label: 'Balance Sheet' },
    { key: 'cfs', label: 'Cash Flow' },
    { key: 'tax', label: 'Tax Schedule' },
  ];

  const dataMap = { is: output.income_statement, bs: output.balance_sheet, cfs: output.cashflow };
  const rowMap  = { is: IS_ROWS, bs: BS_ROWS, cfs: CFS_ROWS };

  return (
    <AppShell title="Financial Statements" actions={allActions}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {TABS.map(({ key, label }) => (
            <button key={key} className={`tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        {/* Phase toggle only relevant for IS/BS/CFS, not tax */}
        {tab !== 'tax' && <FyToggle value={phase} onChange={setPhase} />}
      </div>

      {tab === 'tax' ? (
        <TaxSchedule output={output} fys={visibleFys} />
      ) : (
        <div className="card">
          <TimeSeriesTable rows={rowMap[tab]} fys={visibleFys} data={dataMap[tab]} />
        </div>
      )}
    </AppShell>
  );
}

// ── Metrics Page ──────────────────────────────────────────────────────────

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

export function MetricsPage() {
  const { output, input, isComputing, activeScenarioId, switchScenario, compute, downloadExcel } = useModel();

  const allActions = (
    <OutputBar
      output={output} activeScenarioId={activeScenarioId}
      scenarios={input?.scenarios} onSwitchScenario={switchScenario}
      onDownload={downloadExcel} isComputing={isComputing}
    />
  );

  if (!output) return (
    <AppShell title="Metrics" actions={allActions}>
      <NoOutput onCompute={compute} isComputing={isComputing} />
    </AppShell>
  );

  const m    = output.metrics;
  const fys  = output.meta.operations_fys;

  const metricTiles = [
    { label: 'Project IRR',    value: m.project_irr_pct != null ? `${m.project_irr_pct.toFixed(2)}%` : 'N/A', cls: m.project_irr_pct > 0 ? 'positive' : 'negative' },
    { label: 'Equity IRR',    value: m.equity_irr_pct  != null ? `${m.equity_irr_pct.toFixed(2)}%`  : 'N/A', cls: m.equity_irr_pct  > 0 ? 'positive' : 'negative' },
    { label: 'Project NPV',   value: m.project_npv != null ? `₹${m.project_npv.toFixed(0)} Cr`  : 'N/A', cls: m.project_npv > 0 ? 'positive' : 'negative', sub: `at ${m.wacc_used_pct}% WACC` },
    { label: 'Equity NPV',    value: m.equity_npv  != null ? `₹${m.equity_npv.toFixed(0)} Cr`   : 'N/A', cls: m.equity_npv  > 0 ? 'positive' : 'negative', sub: `at ${m.cost_of_equity_pct}% Ke` },
    { label: 'Min DSCR',      value: m.min_dscr    != null ? `${m.min_dscr.toFixed(2)}x`         : 'N/A', cls: m.min_dscr >= 1.2 ? 'positive' : 'negative' },
    { label: 'Payback Year',  value: m.payback_year || 'N/A', cls: 'accent' },
    { label: 'Peak Debt',     value: m.peak_debt   != null ? `₹${m.peak_debt.toFixed(0)} Cr`     : 'N/A', sub: m.peak_debt_fy },
    { label: 'Debt / EBITDA', value: m.debt_ebitda != null ? `${m.debt_ebitda.toFixed(1)}x`       : 'N/A' },
  ];

  const dscrData = fys.map((fy) => ({ fy, dscr: m.dscr[fy] ?? null })).filter((d) => d.dscr !== null);
  const cfData   = output.meta.fy_range.map((fy) => ({ fy, project: m.project_cashflows?.[fy] ?? 0 }));

  return (
    <AppShell title="Metrics" actions={allActions}>
      <div className="metric-grid" style={{ marginBottom: '2rem' }}>
        {metricTiles.map((t) => (
          <div className="metric-tile" key={t.label}>
            <div className="metric-label">{t.label}</div>
            <div className={`metric-value ${t.cls || ''}`}>{t.value}</div>
            {t.sub && <div className="metric-sub">{t.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">DSCR by Year</span>
            <span className="badge badge-neutral">Operations Phase</span>
          </div>
          <div style={{ padding: '1.25rem', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dscrData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fy" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <Tooltip content={customTooltip} />
                <ReferenceLine y={1.2} stroke="var(--gold)" strokeDasharray="4 2"
                  label={{ value: 'Gate 1.2x', fill: 'var(--gold)', fontSize: 10 }} />
                <Bar dataKey="dscr" name="DSCR" radius={[3, 3, 0, 0]}>
                  {dscrData.map((d, i) => (
                    <Cell key={i} fill={d.dscr >= 1.2 ? 'var(--green)' : 'var(--red)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Project Cash Flows</span></div>
          <div style={{ padding: '1.25rem', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cfData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fy" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <Tooltip content={customTooltip} />
                <ReferenceLine y={0} stroke="var(--border-2)" />
                <Bar dataKey="project" name="Cash Flow (₹ Cr)" radius={[3, 3, 0, 0]}>
                  {cfData.map((d, i) => (
                    <Cell key={i} fill={d.project >= 0 ? 'var(--green)' : 'var(--red)'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header"><span className="card-title">Debt Service Schedule</span></div>
        <TimeSeriesTable
          rows={[
            { key: 'closing_loan',        label: 'Closing Loan Balance' },
            { key: 'interest_expense',    label: 'Interest Expense (P&L)' },
            { key: 'principal_repayment', label: 'Principal Repayment' },
            { key: 'total_debt_service',  label: 'Total Debt Service', isSubtotal: true },
          ]}
          fys={output.meta.operations_fys}
          data={output.debt}
        />
      </div>
    </AppShell>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────

export function DashboardPage() {
  const { output, input, isComputing, activeScenarioId, switchScenario, compute, downloadExcel } = useModel();

  const allActions = (
    <OutputBar
      output={output} activeScenarioId={activeScenarioId}
      scenarios={input?.scenarios} onSwitchScenario={switchScenario}
      onDownload={downloadExcel} isComputing={isComputing}
    />
  );

  if (!output) return (
    <AppShell title="Dashboard" actions={allActions}>
      <NoOutput onCompute={compute} isComputing={isComputing} />
    </AppShell>
  );

  const m      = output.metrics;
  const is     = output.income_statement;
  const opsFys = output.meta.operations_fys;
  const allFys = output.meta.fy_range;

  const revData  = opsFys.map((fy) => ({ fy, revenue: is.revenue[fy] ?? 0, ebitda: is.ebitda[fy] ?? 0, pat: is.pat[fy] ?? 0 }));
  const debtData = allFys.map((fy) => ({ fy, loan: output.debt.closing_loan[fy] ?? 0, ebitda: is.ebitda[fy] ?? 0 }));

  const topMetrics = [
    { label: 'Project IRR',     value: m.project_irr_pct != null ? `${m.project_irr_pct.toFixed(2)}%` : 'N/A', cls: m.project_irr_pct > 0 ? 'positive' : 'negative' },
    { label: 'Equity IRR',     value: m.equity_irr_pct  != null ? `${m.equity_irr_pct.toFixed(2)}%`  : 'N/A', cls: m.equity_irr_pct  > 0 ? 'positive' : 'negative' },
    { label: 'Min DSCR',       value: m.min_dscr != null ? `${m.min_dscr.toFixed(2)}x` : 'N/A', cls: m.min_dscr >= 1.2 ? 'positive' : 'negative' },
    { label: 'Project NPV',    value: m.project_npv != null ? `₹${m.project_npv.toFixed(0)} Cr` : 'N/A', cls: m.project_npv > 0 ? 'positive' : 'negative' },
    { label: 'Peak Debt',      value: m.peak_debt   != null ? `₹${m.peak_debt.toFixed(0)} Cr`   : 'N/A' },
    { label: 'Equity Required',value: `₹${(output.debt.equity_required || 0).toFixed(0)} Cr` },
  ];

  return (
    <AppShell title="Dashboard" actions={allActions}>
      <div className="metric-grid" style={{ marginBottom: '1.75rem' }}>
        {topMetrics.map((t) => (
          <div className="metric-tile" key={t.label}>
            <div className="metric-label">{t.label}</div>
            <div className={`metric-value ${t.cls || 'accent'}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">P&L Trend — Operations Phase</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>₹ Crores</span>
          </div>
          <div style={{ padding: '1.25rem', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fy" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)' }} />
                <ReferenceLine y={0} stroke="var(--border-2)" />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--blue)"  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ebitda"  name="EBITDA"  stroke="var(--gold)"  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pat"     name="PAT"     stroke="var(--green)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Key Ratios</span></div>
          <div className="card-body" style={{ maxHeight: 340, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
            {/* Column headers */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.2rem 0 0.45rem', borderBottom: '2px solid var(--border-2)',
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              <span>Year</span>
              <span>EBITDA Margin</span>
              <span>DSCR</span>
            </div>
            {opsFys.map((fy) => {
              const dscr    = m.dscr?.[fy];
              const ebitdaM = is.ebitda_margin_pct?.[fy];
              return (
                <div key={fy} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.45rem 0', borderBottom: '1px solid var(--border)',
                  fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ color: 'var(--muted)' }}>{fy}</span>
                  <span style={{ color: ebitdaM > 50 ? 'var(--green)' : 'var(--text-2)' }}>
                    {ebitdaM != null ? `${ebitdaM.toFixed(1)}%` : '—'}
                  </span>
                  <span style={{ color: dscr >= 1.2 ? 'var(--green)' : dscr != null ? 'var(--red)' : 'var(--muted)' }}>
                    {dscr != null ? `${dscr.toFixed(2)}x` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Loan Balance vs EBITDA</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--muted)' }}>₹ Crores</span>
        </div>
        <div style={{ padding: '1.25rem', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={debtData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="fy" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted-2)' }} />
              <Line type="monotone" dataKey="loan"   name="Loan Balance" stroke="var(--red)"  strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ebitda" name="EBITDA"       stroke="var(--gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
}
