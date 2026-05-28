import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell, Icon, Spinner, ReadOnlyBanner } from '../components/ui';
import { useModel } from '../hooks/useModel';
import { versionsApi } from '../lib/api';
import { toast } from '../store';

const PHASES = ['operations', 'construction', 'both'];
const PHASE_LABELS = { operations: 'Operations', construction: 'Construction', both: 'Both' };
const PHASE_CLS    = { operations: 'phase-operations', construction: 'phase-construction', both: 'phase-both' };

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA INPUT with live validation + autocomplete picker
// ─────────────────────────────────────────────────────────────────────────────

function FormulaInput({ value, onChange, assumptions, versionId, projectId }) {
  const [status, setStatus]       = useState(null);
  const [result, setResult]       = useState(null);
  const [errMsg, setErrMsg]       = useState('');
  const [picker, setPicker]       = useState(false);   // dropdown open
  const [filter, setFilter]       = useState('');      // search within picker
  const inputRef                  = useRef(null);
  const timer                     = useRef(null);

  // Live validation debounce
  useEffect(() => {
    if (!value?.trim()) { setStatus(null); return; }
    setStatus('checking');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!projectId || !versionId) { setStatus(null); return; }
      try {
        const { data } = await versionsApi.validateFormula(projectId, versionId, {
          formula: value, assumptions, testFy: 'FY2033',
        });
        setStatus(data.valid ? 'valid' : 'invalid');
        setResult(data.valid ? data.result : null);
        setErrMsg(data.error || '');
      } catch { setStatus(null); }
    }, 650);
    return () => clearTimeout(timer.current);
  }, [value, versionId]);

  // Insert a key at the cursor position (or append)
  const insertKey = useCallback((key) => {
    const el = inputRef.current;
    if (!el) { onChange(value + key); setPicker(false); return; }
    const start = el.selectionStart ?? value.length;
    const end   = el.selectionEnd   ?? value.length;
    // Add a space before if needed
    const before = value.slice(0, start);
    const after  = value.slice(end);
    const sep = before.length > 0 && !/[\s(+\-*/]$/.test(before) ? ' ' : '';
    const newVal = before + sep + key + after;
    onChange(newVal);
    setPicker(false);
    setFilter('');
    // Restore focus and move cursor after inserted key
    setTimeout(() => {
      el.focus();
      const pos = start + sep.length + key.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }, [value, onChange]);

  const borderColor =
    status === 'valid'   ? 'var(--green)' :
    status === 'invalid' ? 'var(--red)'   : 'var(--blue-border)';

  const filteredKeys = assumptions.filter((a) =>
    !filter || a.key.includes(filter.toLowerCase()) || a.label?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
        {/* Formula input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="form-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. area * rate / 100 * 12 / 10000000"
            spellCheck={false}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
              background: 'var(--blue-pale)', color: '#1d4ed8',
              borderColor, paddingRight: '6rem',
            }}
          />
          {/* Validation status badge */}
          <div style={{
            position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem', pointerEvents: 'none',
            color: status === 'valid' ? 'var(--green)' : status === 'invalid' ? 'var(--red)' : 'var(--muted)',
          }}>
            {status === 'checking' && <Spinner size={10} />}
            {status === 'valid'    && <><Icon name="check" size={11} /> {result != null ? result.toFixed(2) : 'ok'}</>}
            {status === 'invalid'  && <><Icon name="x" size={11} /> error</>}
          </div>
        </div>

        {/* Insert key button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => { setPicker(!picker); setFilter(''); }}
          title="Insert a parameter key"
          style={{ flexShrink: 0, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
        >
          <Icon name="plus" size={12} /> Key
        </button>
      </div>

      {/* Validation feedback */}
      {status === 'invalid' && errMsg && (
        <div style={{ fontSize: '0.7rem', color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
          {errMsg}
        </div>
      )}
      {status === 'valid' && result != null && (
        <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
          ✓ Evaluates to {result.toFixed(3)} in FY2033
        </div>
      )}

      {/* Key picker dropdown */}
      {picker && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 200, marginTop: '0.25rem',
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          width: 300, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <input
              className="form-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search keys…"
              autoFocus
              style={{ fontSize: '0.78rem' }}
            />
          </div>

          {/* Key list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {/* Special variables first */}
            {['year', 'fy'].filter((k) => !filter || k.includes(filter)).map((k) => (
              <button
                key={k}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertKey(k); }}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '0.42rem 0.85rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--blue-pale)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600 }}>{k}</code>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>special variable</span>
              </button>
            ))}

            {/* Parameter keys */}
            {filteredKeys.length === 0 && (
              <div style={{ padding: '0.85rem', fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                No matching keys
              </div>
            )}
            {filteredKeys.map((a) => (
              <button
                key={a.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertKey(a.key); }}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '0.42rem 0.85rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--blue-pale)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <div style={{ textAlign: 'left' }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 500, display: 'block' }}>
                    {a.key}
                  </code>
                  {a.label && (
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-3)' }}>{a.label}</span>
                  )}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: '0.5rem', flexShrink: 0 }}>
                  {a.value}{a.unit ? ` ${a.unit}` : ''}
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: '0.67rem', color: 'var(--muted)' }}>
            Click a key to insert it at the cursor position
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER ROW — expand to edit
// ─────────────────────────────────────────────────────────────────────────────

function DriverRow({ item, assumptions, projectId, versionId, onChange, onDelete }) {
  const [open, setOpen] = useState(!item.label);

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      marginBottom: '0.5rem', overflow: 'visible',    // visible so autocomplete dropdown escapes
      boxShadow: open ? 'var(--shadow-sm)' : 'none',
    }}>
      {/* Collapsed header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.65rem',
          padding: '0.7rem 1rem', cursor: 'pointer',
          background: open ? 'var(--surface-2)' : 'var(--surface)',
          transition: 'background 0.15s',
          borderRadius: open ? '0' : 'var(--radius)',
        }}
        onClick={() => setOpen(!open)}
      >
        <Icon
          name="chevron" size={12}
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}
        />
        <input
          className="form-input"
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Line item name (e.g. Office Lease Income)"
          style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: '0.87rem', fontWeight: 500, color: 'var(--text)', outline: 'none' }}
        />
        <span className={`phase-pill ${PHASE_CLS[item.phase]}`}>{PHASE_LABELS[item.phase]}</span>
        {item.category && <span className="badge badge-neutral" style={{ fontSize: '0.63rem' }}>{item.category}</span>}
        {!open && item.formula && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-3)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.formula}
          </span>
        )}
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ color: 'var(--muted)', flexShrink: 0 }}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>

      {/* Expanded editor */}
      {open && (
        <div style={{ padding: '0.9rem 1rem 1rem 2.2rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem', marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Category <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input className="form-input" value={item.category}
                onChange={(e) => onChange({ ...item, category: e.target.value })}
                placeholder="e.g. Lease Income" />
            </div>
            <div className="form-group">
              <label className="form-label">Phase</label>
              <select className="form-input" value={item.phase}
                onChange={(e) => onChange({ ...item, phase: e.target.value })}>
                {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input className="form-input" value={item.notes || ''}
                onChange={(e) => onChange({ ...item, notes: e.target.value })}
                placeholder="Reminder or description" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '0.35rem' }}>
              Formula
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                — type or click "+ Key" to insert a parameter
              </span>
            </label>
            <FormulaInput
              value={item.formula || ''}
              onChange={(v) => onChange({ ...item, formula: v })}
              assumptions={assumptions}
              projectId={projectId}
              versionId={versionId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED SCHEDULE TABLE
// ─────────────────────────────────────────────────────────────────────────────

function ComputedSchedule({ output, type }) {
  const isRevenue = type === 'revenue';
  const section   = isRevenue ? output?.revenue : output?.costs;
  if (!section || !output) return null;

  const fys      = output.meta.fy_range;
  const byLine   = isRevenue ? section.revenue_by_line  : section.cost_by_line;
  const metadata = isRevenue ? section.revenue_metadata : section.cost_metadata;
  const totalKey = isRevenue ? 'revenue_total'          : 'cost_total';
  const total    = section[totalKey] || {};
  const lineIds  = Object.keys(byLine || {});
  if (lineIds.length === 0) return null;

  const fmt = (v) => (v == null || Math.abs(v) < 0.001)
    ? <span style={{ color: 'var(--muted)' }}>—</span>
    : v.toFixed(1);

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div className="card-header">
        <span className="card-title">
          {isRevenue ? 'Revenue Schedule' : 'Cost Schedule'}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: '0.6rem' }}>
            {output.meta.currency}
          </span>
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          Scenario: <strong style={{ color: 'var(--blue)' }}>
            {output.meta.active_scenario || 'base'}
          </strong>
          {output.meta.active_scenario && output.meta.active_scenario !== (output.meta.active_scenario)
            ? <span style={{ color: 'var(--amber)', marginLeft: '0.4rem' }}>⚠ stale</span>
            : null}
        </span>
      </div>
      {/* overflowX: auto ONLY on the table wrapper — page doesn't scroll horizontally */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Line Item</th>
              {fys.map((fy) => <th key={fy}>{fy}</th>)}
            </tr>
          </thead>
          <tbody>
            {lineIds.map((id) => {
              const meta   = metadata?.[id] || {};
              const values = byLine[id]     || {};
              return (
                <tr key={id}>
                  <td>
                    <div>{meta.label || id}</div>
                    {meta.category && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{meta.category}</div>}
                  </td>
                  {fys.map((fy) => <td key={fy}>{fmt(values[fy])}</td>)}
                </tr>
              );
            })}
            <tr className="total">
              <td>Total {isRevenue ? 'Revenue' : 'Costs'}</td>
              {fys.map((fy) => <td key={fy}>{fmt(total[fy])}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS PAGE
// ─────────────────────────────────────────────────────────────────────────────

function DriversPage({ type }) {
  const isRevenue = type === 'revenue';
  const { input, output, updateInput, save, isComputing, versionId, projectId, activeScenarioId, switchScenario, isExample } = useModel();
  const [saving, setSaving] = useState(false);

  if (!input) return (
    <AppShell title={isRevenue ? 'Revenue' : 'Costs'}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const field      = isRevenue ? 'revenue_drivers' : 'cost_drivers';
  const items      = input[field]?.line_items || [];
  const assumptions = input.assumptions || [];
  const scenarios   = input.scenarios || [];

  const addItem = () => {
    updateInput({
      [field]: {
        line_items: [...items, {
          id: `driver_${Date.now()}`,
          label: '', category: '', phase: 'operations', formula: '', notes: '',
        }],
      },
    });
  };

  const updateItem = (i, updated) => {
    const next = [...items]; next[i] = updated;
    updateInput({ [field]: { line_items: next } });
  };

  const deleteItem = (i) => {
    updateInput({ [field]: { line_items: items.filter((_, j) => j !== i) } });
  };

  const handleSave = async () => {
    setSaving(true);
    try { await save(`Updated ${type}`); }
    finally { setSaving(false); }
  };

  const pageTitle = isRevenue ? 'Revenue' : 'Costs';

  return (
    <AppShell
      title={pageTitle}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {scenarios.length > 1 && (
            <div className="scenario-bar">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
                  onClick={() => switchScenario(s.id)}
                  disabled={isComputing}
                >
                  {isComputing && activeScenarioId === s.id ? <Spinner size={11} /> : s.label}
                </button>
              ))}
            </div>
          )}
          {!isExample && (
            <button className="btn btn-secondary btn-sm" onClick={addItem}>
              <Icon name="plus" size={13} /> Add Line Item
            </button>
          )}
          {!isExample && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
              {saving || isComputing ? <Spinner size={14} /> : <><Icon name="save" size={14} /> Save & Compute</>}
            </button>
          )}
        </div>
      }
    >
      {/* ── Read-only banner ── */}
      {isExample && <ReadOnlyBanner />}

      {/* ── Line items — full width, no sidebar column ── */}
      <div style={{ pointerEvents: isExample ? 'none' : 'auto', opacity: isExample ? 0.88 : 1 }}>
      {items.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            No {pageTitle.toLowerCase()} line items yet.
          </p>
          <button className="btn btn-secondary" onClick={addItem}>
            <Icon name="plus" size={14} /> Add first line item
          </button>
        </div>
      ) : (
        <>
          {/* Quick-reference key chips above the list — compact, no wasted space */}
          {assumptions.length > 0 && (
            <div style={{
              marginBottom: '0.85rem', padding: '0.5rem 0.75rem',
              background: 'var(--blue-pale)', border: '1px solid var(--blue-border)',
              borderRadius: 'var(--radius)', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.67rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginRight: '0.25rem', whiteSpace: 'nowrap' }}>
                Available keys:
              </span>
              {assumptions.map((a) => (
                <span key={a.key} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                  color: 'var(--blue)', background: 'var(--blue-dim)',
                  padding: '0.1rem 0.45rem', borderRadius: 3,
                  cursor: 'default', whiteSpace: 'nowrap',
                }} title={`${a.label} = ${a.value}${a.unit ? ' ' + a.unit : ''}`}>
                  {a.key}
                </span>
              ))}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', background: 'var(--surface-3)', padding: '0.1rem 0.45rem', borderRadius: 3 }}>
                year
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', background: 'var(--surface-3)', padding: '0.1rem 0.45rem', borderRadius: 3 }}>
                fy
              </span>
            </div>
          )}

          {items.map((item, i) => (
            <DriverRow
              key={item.id || i}
              item={item}
              assumptions={assumptions}
              projectId={projectId}
              versionId={versionId}
              onChange={(updated) => updateItem(i, updated)}
              onDelete={() => deleteItem(i)}
            />
          ))}

          {!isExample && (
            <button className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginTop: '0.25rem' }}>
              <Icon name="plus" size={13} /> Add line item
            </button>
          )}
        </>
      )}

      </div>

      {/* ── Computed schedule ── */}
      {output && <ComputedSchedule output={output} type={type} />}

      {!output && items.length > 0 && (
        <div style={{
          marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
            Save & Compute to see the {pageTitle.toLowerCase()} schedule.
          </p>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
            {saving || isComputing ? <Spinner size={14} /> : <><Icon name="play" size={14} /> Save & Compute</>}
          </button>
        </div>
      )}
    </AppShell>
  );
}

export function RevenueDriversPage() { return <DriversPage type="revenue" />; }
export function CostDriversPage()    { return <DriversPage type="costs" />; }
