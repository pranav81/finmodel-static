import { useState, useMemo } from 'react';
import { AppShell, Icon, SectionTitle, Spinner, ReadOnlyBanner } from '../components/ui';
import { useModel } from '../hooks/useModel';

function buildFyRange(first, last) {
  const fys = [];
  for (let y = first; y <= last; y++) fys.push(`FY${y}`);
  return fys;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPEX PAGE
// ─────────────────────────────────────────────────────────────────────────────

function TrancheCard({ tranche, fys, totalCapex, onUpdate, onDelete }) {
  const profileTotal = Object.values(tranche.disbursement_profile).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(profileTotal - 1) < 0.001 || profileTotal === 0;

  const updateFrac = (fy, raw) => {
    const val = parseFloat(raw);
    const updated = { ...tranche.disbursement_profile };
    if (isNaN(val) || val === 0) delete updated[fy];
    else updated[fy] = val;
    onUpdate({ ...tranche, disbursement_profile: updated });
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-header">
        <input
          className="form-input"
          value={tranche.label}
          onChange={(e) => onUpdate({ ...tranche, label: e.target.value })}
          placeholder="Tranche name (e.g. Civil & Structural Works)"
          style={{
            flex: 1, background: 'transparent', border: 'none', padding: 0,
            fontSize: '0.95rem', fontFamily: 'var(--font-display)',
            color: 'var(--text)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
              Total Cost ({'\u20b9'} Cr)
            </div>
            <input
              className="form-input"
              type="number"
              value={tranche.total_cost || ''}
              onChange={(e) => onUpdate({ ...tranche, total_cost: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              style={{ width: 140, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 500 }}
            />
          </div>
          {totalCapex > 0 && tranche.total_cost > 0 && (
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', minWidth: 60 }}>
              {((tranche.total_cost / totalCapex) * 100).toFixed(1)}%
            </div>
          )}
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onDelete} style={{ color: 'var(--muted)' }}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Disbursement Profile — fractions per year (must sum to 1.0)
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 500,
            color: profileTotal === 0 ? 'var(--muted)' : isValid ? 'var(--green)' : 'var(--red)',
          }}>
            {profileTotal === 0 ? 'Not filled' : `\u03a3 = ${profileTotal.toFixed(3)} ${isValid ? '\u2713' : '\u2260 1.0'}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {fys.map((fy) => {
            const frac = tranche.disbursement_profile[fy];
            const amount = frac ? (tranche.total_cost * frac) : null;
            return (
              <div key={fy} style={{ textAlign: 'center', minWidth: 76 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>{fy}</div>
                <input
                  type="number" min="0" max="1" step="0.01"
                  className="form-input"
                  value={frac ?? ''}
                  onChange={(e) => updateFrac(fy, e.target.value)}
                  placeholder="—"
                  style={{ width: 76, textAlign: 'center', padding: '0.35rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                />
                {amount != null && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                    {'\u20b9'}{amount.toFixed(1)} Cr
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CapexPage() {
  const { input, output, updateInput, save, isComputing, isExample } = useModel();
  const [saving, setSaving] = useState(false);

  if (!input) return (
    <AppShell title="CAPEX">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const capex    = input.capex || {};
  const tranches = capex.tranches || [];
  const meta     = input.meta || {};
  const fys      = buildFyRange(meta.first_fy || 2027, meta.construction_end_fy || 2032);
  const totalCapex = tranches.reduce((s, t) => s + (t.total_cost || 0), 0);

  const updateTranche = (i, updated) => {
    const next = [...tranches]; next[i] = updated;
    updateInput({ capex: { ...capex, tranches: next } });
  };

  const addTranche = () => {
    updateInput({ capex: { ...capex, tranches: [...tranches, { label: '', total_cost: 0, disbursement_profile: {} }] } });
  };

  const deleteTranche = (i) => {
    updateInput({ capex: { ...capex, tranches: tranches.filter((_, j) => j !== i) } });
  };

  const handleSave = async () => { setSaving(true); try { await save('Updated CAPEX'); } finally { setSaving(false); } };

  return (
    <AppShell
      title="CAPEX Schedule"
      actions={!isExample ? (
        <>
          <button className="btn btn-secondary btn-sm" onClick={addTranche}>
            <Icon name="plus" size={14} /> Add Tranche
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
            {saving || isComputing ? <Spinner size={14} /> : <><Icon name="save" size={14} /> Save & Compute</>}
          </button>
        </>
      ) : null}
    >
      {isExample && <ReadOnlyBanner />}
      <div style={{ pointerEvents: isExample ? 'none' : 'auto', opacity: isExample ? 0.88 : 1 }}>
      {/* ── Project timeline settings ── */}
      <div className="card" style={{ padding: '1.1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'First FY',               field: 'meta', key: 'first_fy',            type: 'number', w: 110 },
            { label: 'Last FY',                field: 'meta', key: 'last_fy',             type: 'number', w: 110 },
            { label: 'Construction End FY',    field: 'meta', key: 'construction_end_fy', type: 'number', w: 130 },
            { label: 'Asset Life (yrs)',        field: 'capex', key: 'useful_life_years',  type: 'number', w: 100 },
            { label: 'Salvage Value (%)',       field: 'capex', key: 'salvage_pct',        type: 'number', step: '0.1', w: 110 },
          ].map(({ label, field, key, w, ...rest }) => (
            <div key={key} className="form-group" style={{ gap: '0.3rem' }}>
              <label className="form-label">{label}</label>
              <input
                {...rest} className="form-input"
                value={(field === 'meta' ? meta : capex)[key] ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  if (field === 'meta') updateInput({ meta: { ...meta, [key]: parseInt(e.target.value) || 0 } });
                  else updateInput({ capex: { ...capex, [key]: v } });
                }}
                style={{ width: w, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          ))}
          <div className="form-group" style={{ gap: '0.3rem' }}>
            <label className="form-label">Capitalisation FY</label>
            <select className="form-input"
              value={capex.capitalisation_fy || fys[fys.length - 1] || ''}
              onChange={(e) => updateInput({ capex: { ...capex, capitalisation_fy: e.target.value } })}
              style={{ width: 120 }}>
              {fys.map((fy) => <option key={fy}>{fy}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Tranches ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <SectionTitle>CAPEX Tranches</SectionTitle>
        {totalCapex > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--blue)', fontWeight: 500 }}>
            Total: {'\u20b9'}{totalCapex.toFixed(1)} Cr
          </span>
        )}
      </div>

      {tranches.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            No CAPEX tranches yet. Add one or more cost components for this project.
          </p>
          <button className="btn btn-secondary" onClick={addTranche}>
            <Icon name="plus" size={14} /> Add your first tranche
          </button>
        </div>
      ) : (
        tranches.map((t, i) => (
          <TrancheCard key={i} tranche={t} fys={fys} totalCapex={totalCapex}
            onUpdate={(u) => updateTranche(i, u)}
            onDelete={() => deleteTranche(i)}
          />
        ))
      )}

      </div>

      {/* ── Depreciation & Net Block Schedule ── */}
      {output ? (
        <CapexScheduleTable output={output} />
      ) : tranches.length > 0 && (
        <div style={{
          marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
            Save & Compute to see the depreciation and net block schedule.
          </p>
        </div>
      )}
    </AppShell>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// CAPEX / DEPRECIATION / NET BLOCK SCHEDULE TABLE
// ─────────────────────────────────────────────────────────────────────────────

function CapexScheduleTable({ output }) {
  const cap  = output?.capex;
  const debt = output?.debt;
  const fys  = output?.meta?.fy_range;
  if (!cap || !fys) return null;

  const grossBlock   = Object.values(cap.gross_block).find((v) => v > 0) || 0;
  const capexTotal   = Object.values(cap.total_capex).reduce((s, v) => s + v, 0);
  const cumIDC       = debt?.cumulative_idc || 0;
  const usefulLife   = output?.meta ? null : null;

  const fmt = (v) =>
    v == null || Math.abs(v) < 0.001
      ? <span style={{ color: 'var(--muted)' }}>—</span>
      : v.toFixed(1);

  const rows = [
    { key: 'total_capex',             label: 'CAPEX Spend',                    section: 'capex' },
    { key: 'cwip',                    label: 'CWIP (closing balance)',          section: 'capex' },
    { key: '_gross', isSectionHeader: true, label: 'CAPITALISATION' },
    { key: 'gross_block',             label: 'Gross Block',                     bold: true },
    { key: '_dep', isSectionHeader: true, label: 'DEPRECIATION (SLM)' },
    { key: 'depreciation',            label: 'Depreciation Charge',            section: 'capex' },
    { key: 'accumulated_depreciation',label: 'Accumulated Depreciation',       section: 'capex', subtle: true },
    { key: '_nb', isSectionHeader: true, label: 'NET BLOCK' },
    { key: 'net_block',               label: 'Net Block (closing)',             bold: true },
  ];

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="card-header">
        <span className="card-title">
          CAPEX, Depreciation & Net Block Schedule
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: '0.6rem' }}>
            {output.meta.currency}
          </span>
        </span>
        {/* Summary: gross block breakdown */}
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
          <span>
            Total CAPEX: <strong style={{ color: 'var(--text)' }}>₹{capexTotal.toFixed(1)} Cr</strong>
          </span>
          <span>
            + Capitalised IDC: <strong style={{ color: 'var(--text)' }}>₹{cumIDC.toFixed(1)} Cr</strong>
          </span>
          <span>
            = Gross Block: <strong style={{ color: 'var(--blue)' }}>₹{grossBlock.toFixed(1)} Cr</strong>
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Line Item</th>
              {fys.map((fy) => <th key={fy}>{fy}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, bold, subtle, isSectionHeader }) => {
              if (isSectionHeader) {
                return (
                  <tr key={key} className="section-header">
                    <td colSpan={fys.length + 1}>{label}</td>
                  </tr>
                );
              }
              const data = cap[key] || {};
              return (
                <tr key={key} className={bold ? 'subtotal' : ''}>
                  <td style={{ color: subtle ? 'var(--text-3)' : undefined }}>{label}</td>
                  {fys.map((fy) => (
                    <td key={fy} style={{ color: subtle ? 'var(--text-3)' : undefined }}>
                      {fmt(data[fy])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBT AMORTISATION SCHEDULE TABLE
// ─────────────────────────────────────────────────────────────────────────────

function DebtScheduleTable({ output }) {
  const debt = output?.debt;
  const fys  = output?.meta?.fy_range;
  if (!debt || !fys) return null;

  const fmt = (v) => {
    if (v == null || v === 0) return <span style={{ color: 'var(--muted)' }}>—</span>;
    return Math.abs(v) < 0.001 ? '—' : v.toFixed(1);
  };

  const rows = [
    { key: 'drawdown',             label: 'Debt Drawdown',               note: 'construction' },
    { key: 'idc',                  label: 'IDC (capitalised into CWIP)',  note: 'construction' },
    { key: 'opening_loan',         label: 'Opening Loan Balance' },
    { key: 'closing_loan',         label: 'Closing Loan Balance',         bold: true },
    { key: 'interest_expense',     label: 'Interest Expense (P&L)',       note: 'operations' },
    { key: 'principal_repayment',  label: 'Principal Repayment',          note: 'operations' },
    { key: 'total_debt_service',   label: 'Total Debt Service',           bold: true, note: 'operations' },
  ];

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="card-header">
        <span className="card-title">
          Debt Amortisation Schedule
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: '0.6rem' }}>
            {output.meta.currency}
          </span>
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          Cumulative IDC: <strong style={{ color: 'var(--blue)' }}>
            ₹{(debt.cumulative_idc || 0).toFixed(1)} Cr
          </strong>
          &nbsp;&nbsp;Total Drawn: <strong style={{ color: 'var(--blue)' }}>
            ₹{Object.values(debt.drawdown || {}).reduce((s, v) => s + v, 0).toFixed(1)} Cr
          </strong>
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Line Item</th>
              {fys.map((fy) => <th key={fy}>{fy}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, bold, note }) => (
              <tr key={key} className={bold ? 'subtotal' : ''}>
                <td>
                  <div>{label}</div>
                  {note && (
                    <div style={{ fontSize: '0.63rem', color: 'var(--muted)', marginTop: '0.05rem' }}>
                      {note === 'construction' ? '▲ construction phase' : '▼ operations phase'}
                    </div>
                  )}
                </td>
                {fys.map((fy) => (
                  <td key={fy}>{fmt(debt[key]?.[fy])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBT PAGE — ratio-based financing structure
// ─────────────────────────────────────────────────────────────────────────────

export function DebtPage() {
  const { input, output, updateInput, save, isComputing, isExample } = useModel();
  const [saving, setSaving] = useState(false);

  if (!input) return (
    <AppShell title="Debt & Financing">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const debt    = input.debt  || {};
  const meta    = input.meta  || {};
  const capex   = input.capex || {};
  const tranches = capex.tranches || [];
  const allFys   = buildFyRange(meta.first_fy || 2027, meta.last_fy   || 2041);
  const conFys   = buildFyRange(meta.first_fy || 2027, meta.construction_end_fy || 2032);

  // Total CAPEX from tranches
  const totalCapex = tranches.reduce((s, t) => s + (t.total_cost || 0), 0);

  // Derived debt and equity amounts from ratios
  const debtPct   = parseFloat(debt.debt_pct)   || 0;
  const equityPct = 100 - debtPct;
  const derivedDebt   = totalCapex * debtPct   / 100;
  const derivedEquity = totalCapex * equityPct / 100;

  // Drawdown profile validation
  const drawdownTotal = Object.values(debt.drawdown_profile || {}).reduce((s, v) => s + v, 0);
  const drawdownValid = Math.abs(drawdownTotal - 1) < 0.001 || drawdownTotal === 0;

  const updateDebt = (patch) => updateInput({ debt: { ...debt, ...patch } });

  const handleDebtPctChange = (val) => {
    const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
    updateDebt({ debt_pct: pct, equity_pct: 100 - pct, total_debt: totalCapex * pct / 100 });
  };

  const updateDrawdown = (fy, raw) => {
    const val = parseFloat(raw);
    const updated = { ...(debt.drawdown_profile || {}) };
    if (isNaN(val) || val === 0) delete updated[fy]; else updated[fy] = val;
    updateDebt({ drawdown_profile: updated });
  };

  const handleSave = async () => { setSaving(true); try { await save('Updated debt & financing'); } finally { setSaving(false); } };

  return (
    <AppShell
      title="Debt & Financing"
      actions={!isExample ? (
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
          {saving || isComputing ? <Spinner size={14} /> : <><Icon name="save" size={14} /> Save & Compute</>}
        </button>
      ) : null}
    >

      {isExample && <ReadOnlyBanner />}
      <div style={{ pointerEvents: isExample ? 'none' : 'auto', opacity: isExample ? 0.88 : 1 }}>
      {/* ── Financing Structure ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><span className="card-title">Financing Structure</span></div>
        <div className="card-body">

          {/* Ratio slider + display */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Debt / Equity Split
              </span>
              {totalCapex === 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Add CAPEX tranches first to see derived amounts
                </span>
              )}
            </div>

            {/* Visual bar */}
            <div style={{ display: 'flex', height: 36, borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '0.75rem' }}>
              <div style={{
                width: `${debtPct}%`, background: 'var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff',
                transition: 'width 0.2s',
                minWidth: debtPct > 5 ? 'auto' : 0,
              }}>
                {debtPct > 8 ? `Debt ${debtPct.toFixed(0)}%` : ''}
              </div>
              <div style={{
                flex: 1, background: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff',
                transition: 'width 0.2s',
              }}>
                {equityPct > 8 ? `Equity ${equityPct.toFixed(0)}%` : ''}
              </div>
            </div>

            {/* Slider */}
            <input
              type="range" min="0" max="100" step="1"
              value={debtPct}
              onChange={(e) => handleDebtPctChange(e.target.value)}
              style={{ width: '100%', marginBottom: '0.85rem', accentColor: 'var(--blue)' }}
            />

            {/* Numeric inputs + derived amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Debt */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '1rem',
              }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  Debt
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    className="form-input"
                    type="number" min="0" max="100" step="1"
                    value={debtPct}
                    onChange={(e) => handleDebtPctChange(e.target.value)}
                    style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, textAlign: 'right' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>%</span>
                </div>
                {totalCapex > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text)' }}>
                    = {'\u20b9'}{derivedDebt.toFixed(1)} Cr
                  </div>
                )}
              </div>

              {/* Equity */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '1rem',
              }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  Equity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    className="form-input"
                    type="number" min="0" max="100" step="1"
                    value={equityPct}
                    onChange={(e) => handleDebtPctChange(100 - (parseFloat(e.target.value) || 0))}
                    style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, textAlign: 'right' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>%</span>
                </div>
                {totalCapex > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text)' }}>
                    = {'\u20b9'}{derivedEquity.toFixed(1)} Cr
                  </div>
                )}
              </div>
            </div>

            {totalCapex > 0 && (
              <div style={{
                marginTop: '0.85rem', padding: '0.6rem 0.85rem',
                background: 'var(--blue-pale)', border: '1px solid var(--blue-border)',
                borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                color: 'var(--blue)', display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Total CAPEX</span>
                <span>{'\u20b9'}{totalCapex.toFixed(1)} Cr = {'\u20b9'}{derivedDebt.toFixed(1)} Cr Debt + {'\u20b9'}{derivedEquity.toFixed(1)} Cr Equity</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Debt parameters */}
        <div className="card">
          <div className="card-header"><span className="card-title">Debt Terms</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { label: 'Interest Rate (% p.a.)', key: 'interest_rate_pct', step: '0.1', placeholder: '9.5' },
                { label: 'Repayment Period (years)', key: 'repayment_years', type: 'number', placeholder: '6' },
                { label: 'DSCR Dividend Gate (x)', key: 'dscr_dividend_gate', step: '0.05', placeholder: '1.2' },
              ].map(({ label, key, ...rest }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input type="number" {...rest} className="form-input"
                    value={debt[key] ?? ''}
                    onChange={(e) => updateDebt({ [key]: parseFloat(e.target.value) })}
                    style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Moratorium End FY
                  <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                    (principal repayment starts after this)
                  </span>
                </label>
                <select className="form-input" value={debt.moratorium_end_fy || ''}
                  onChange={(e) => updateDebt({ moratorium_end_fy: e.target.value })}>
                  <option value="">— select —</option>
                  {allFys.map((fy) => <option key={fy}>{fy}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">IDC Treatment</label>
                <select className="form-input" value={debt.idc_capitalised ? 'yes' : 'no'}
                  onChange={(e) => updateDebt({ idc_capitalised: e.target.value === 'yes' })}>
                  <option value="yes">Capitalised into CWIP (Ind AS 23)</option>
                  <option value="no">Expensed to P&L</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Drawdown profile */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Debt Drawdown Profile</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 500,
              color: drawdownTotal === 0 ? 'var(--muted)' : drawdownValid ? 'var(--green)' : 'var(--red)',
            }}>
              {drawdownTotal === 0 ? 'Not filled' : `\u03a3 = ${drawdownTotal.toFixed(3)} ${drawdownValid ? '\u2713' : '\u2260 1.0'}`}
            </span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Fraction of total debt drawn each construction year. Must sum to 1.0.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {conFys.map((fy) => {
                const frac = debt.drawdown_profile?.[fy];
                return (
                  <div key={fy} style={{ textAlign: 'center', minWidth: 76 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>{fy}</div>
                    <input
                      type="number" min="0" max="1" step="0.01"
                      className="form-input"
                      value={frac ?? ''}
                      onChange={(e) => updateDrawdown(fy, e.target.value)}
                      placeholder="—"
                      style={{ width: 76, textAlign: 'center', padding: '0.35rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                    />
                    {frac && derivedDebt > 0 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                        {'\u20b9'}{(derivedDebt * frac).toFixed(1)} Cr
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="card">
        <div className="card-header"><span className="card-title">Tax Parameters</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Corporate Tax Rate (%)', key: 'corporate_tax_rate_pct', step: '0.01' },
              { label: 'MAT Rate (%)', key: 'mat_rate_pct', step: '0.1' },
              { label: 'MAT Credit Carry-forward (yrs)', key: 'mat_credit_utilisation_years' },
            ].map(({ label, key, ...rest }) => (
              <div key={key} className="form-group" style={{ minWidth: 220 }}>
                <label className="form-label">{label}</label>
                <input type="number" {...rest} className="form-input"
                  value={(input.tax || {})[key] ?? ''}
                  onChange={(e) => updateInput({ tax: { ...input.tax, [key]: parseFloat(e.target.value) } })}
                  style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>

      {/* ── Debt Amortisation Schedule ── */}
      {output ? (
        <DebtScheduleTable output={output} />
      ) : (
        <div style={{
          marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
            Save & Compute to see the debt amortisation schedule.
          </p>
        </div>
      )}
    </AppShell>
  );
}
