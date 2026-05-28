import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AppShell, Icon, Spinner } from '../components/ui';
import { useModel } from '../hooks/useModel';

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt  = (v, dp = 2) => v != null ? Number(v).toFixed(dp) : 'N/A';
const fmtC = (v) => v != null ? `₹${Number(v).toFixed(1)} Cr` : 'N/A';

function MetricTile({ label, value, sub, accent }) {
  return (
    <div className="metric-tile">
      <div className="metric-label">{label}</div>
      <div className={`metric-value${accent ? ' accent' : ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

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
              <button key={s.id}
                className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
                onClick={() => onSwitchScenario(s.id)} disabled={isComputing}
                style={{ minWidth: 80 }}>
                {isComputing && activeScenarioId === s.id
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Spinner size={11} />{s.label}</span>
                  : s.label}
              </button>
            ))}
          </div>
          {noOverrides && (
            <span style={{ fontSize: '0.67rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
              ⚠ No overrides set — identical to Base Case
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

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW PAGE — merges Metrics + Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { input, output, isComputing, activeScenarioId, switchScenario, downloadExcel, save } = useModel();

  if (!input) return (
    <AppShell title="Overview">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const scenarios = input.scenarios || [];

  if (!output) return (
    <AppShell title="Overview"
      actions={<OutputBar output={null} activeScenarioId={activeScenarioId}
        scenarios={scenarios} onSwitchScenario={switchScenario}
        onDownload={downloadExcel} isComputing={isComputing} />}
    >
      <div className="empty-state">
        <Icon name="chart" size={40} style={{ color: 'var(--muted)', opacity: 0.4 }} />
        <h3>No output yet</h3>
        <p>Save & Compute your model to see the overview.</p>
        <button className="btn btn-primary" onClick={() => save()} disabled={isComputing}>
          {isComputing ? <Spinner size={14} /> : <><Icon name="play" size={14} /> Compute</>}
        </button>
      </div>
    </AppShell>
  );

  const m   = output.metrics;
  const is  = output.income_statement;
  const fys = output.meta.fy_range;
  const opsFys = fys.filter((fy) => is.revenue?.[fy] > 0);

  // ── Chart data ──────────────────────────────────────────────────────────
  const revEbitdaData = opsFys.map((fy) => ({
    fy: fy.replace('FY', ''),
    Revenue: parseFloat((is.revenue?.[fy] || 0).toFixed(1)),
    EBITDA:  parseFloat((is.ebitda?.[fy]  || 0).toFixed(1)),
    PAT:     parseFloat((is.pat?.[fy]     || 0).toFixed(1)),
  }));

  const dscrData = opsFys.map((fy) => ({
    fy: fy.replace('FY', ''),
    DSCR: m.dscr?.[fy] != null ? parseFloat(m.dscr[fy].toFixed(3)) : null,
  }));

  const equityCFs = m.equity_cashflows || {};

  return (
    <AppShell
      title="Overview"
      actions={<OutputBar output={output} activeScenarioId={activeScenarioId}
        scenarios={scenarios} onSwitchScenario={switchScenario}
        onDownload={downloadExcel} isComputing={isComputing} />}
    >
      {/* ── Top metric tiles ── */}
      <div className="metric-grid" style={{ marginBottom: '1.75rem' }}>
        <MetricTile label="Project IRR"  value={m.project_irr_pct  != null ? `${fmt(m.project_irr_pct)}%`  : 'N/A'} accent />
        <MetricTile label="Equity IRR"   value={m.equity_irr_pct   != null ? `${fmt(m.equity_irr_pct)}%`   : 'N/A'} accent />
        <MetricTile label="Project NPV"  value={m.project_npv      != null ? `₹${fmt(m.project_npv, 1)} Cr` : 'N/A'}
          sub={`at ${m.wacc_used_pct}% WACC`} />
        <MetricTile label="Min DSCR"     value={m.min_dscr         != null ? `${fmt(m.min_dscr)}x`         : 'N/A'}
          sub={m.min_dscr != null && m.min_dscr < 1.2 ? '⚠ Below 1.20x gate' : ''} />
        <MetricTile label="Payback Year" value={m.payback_year || 'N/A'} />
        <MetricTile label="Peak Debt"    value={m.peak_debt != null ? `₹${fmt(m.peak_debt, 1)} Cr` : 'N/A'} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>

        {/* Revenue / EBITDA / PAT */}
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue, EBITDA & PAT</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{output.meta.currency}</span>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revEbitdaData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue" fill="var(--blue)"       radius={[2,2,0,0]} />
                <Bar dataKey="EBITDA"  fill="var(--green)"      radius={[2,2,0,0]} />
                <Bar dataKey="PAT"     fill="var(--blue-light)" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DSCR over time */}
        <div className="card">
          <div className="card-header"><span className="card-title">DSCR by Year</span></div>
          <div className="card-body" style={{ padding: '1rem' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dscrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fy" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)' }} />
                <ReferenceLine y={1.2} stroke="var(--amber)" strokeDasharray="4 2"
                  label={{ value: '1.20x gate', fontSize: 10, fill: 'var(--amber)' }} />
                <Line type="monotone" dataKey="DSCR" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Key Ratios table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Key Ratios by Year</span></div>
          <div className="card-body" style={{ maxHeight: 320, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.2rem 0 0.45rem', borderBottom: '2px solid var(--border-2)',
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              <span>Year</span><span>EBITDA Margin</span><span>DSCR</span>
            </div>
            {opsFys.map((fy) => {
              const dscr   = m.dscr?.[fy];
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

        {/* Equity cashflows */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equity Cash Flows</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{output.meta.currency}</span>
          </div>
          <div className="card-body" style={{ maxHeight: 320, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.2rem 0 0.45rem', borderBottom: '2px solid var(--border-2)',
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              <span>Year</span><span>Cash Flow</span>
            </div>
            {fys.filter((fy) => equityCFs[fy] != null).map((fy) => {
              const v = equityCFs[fy];
              return (
                <div key={fy} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.45rem 0', borderBottom: '1px solid var(--border)',
                  fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ color: 'var(--muted)' }}>{fy}</span>
                  <span style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {v >= 0 ? '+' : ''}{v.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
