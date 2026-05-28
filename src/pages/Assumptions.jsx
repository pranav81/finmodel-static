import { useState, useRef } from 'react';
import { AppShell, Icon, Spinner, ReadOnlyBanner } from '../components/ui';
import { useModel } from '../hooks/useModel';
import { toast } from '../store';

// ─────────────────────────────────────────────────────────────────────────────
// KEY GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','of','for','and','in','at','per','to','by','on','as',
  'is','its','with','from','into','than','that','this','or','be',
]);

function generateKey(label, existingKeys = []) {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')          // strip special chars
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .slice(0, 3);                           // max 3 meaningful words

  if (words.length === 0) return '';

  let base = words.join('_').slice(0, 30); // max 30 chars
  if (!existingKeys.includes(base)) return base;

  // Deduplicate
  let n = 2;
  while (existingKeys.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA REFERENCE PANEL
// ─────────────────────────────────────────────────────────────────────────────

function FormulaReference() {
  const [open, setOpen] = useState(false);

  const sections = [
    {
      title: 'Basic arithmetic',
      rows: [
        { formula: 'area * rate',                       result: 'Multiply' },
        { formula: 'revenue - cost',                    result: 'Subtract' },
        { formula: 'value / 10000000',                  result: 'Divide (e.g. ₹ → ₹ Crores)' },
        { formula: 'base * (1 + growth/100) ** years',  result: 'Compound growth' },
        { formula: '(a + b) * c',                       result: 'Grouping with parentheses' },
      ],
    },
    {
      title: 'Built-in functions',
      rows: [
        { formula: 'min(a, b)',   result: 'Smaller of two values' },
        { formula: 'max(a, b)',   result: 'Larger of two values' },
        { formula: 'abs(x)',      result: 'Absolute value' },
        { formula: 'round(x)',    result: 'Round to nearest integer' },
        { formula: 'sqrt(x)',     result: 'Square root' },
        { formula: 'floor(x)',    result: 'Round down' },
        { formula: 'ceil(x)',     result: 'Round up' },
        { formula: 'pow(x, n)',   result: 'x to the power n (same as x**n)' },
      ],
    },
    {
      title: 'Special variables — always available',
      rows: [
        { formula: 'year', result: 'Current year as integer — e.g. 2033' },
        { formula: 'fy',   result: 'Current year as string — e.g. "FY2033"' },
      ],
    },
    {
      title: 'Conditionals — ternary syntax only',
      rows: [
        { formula: '100 if year >= 2033 else 0',                   result: '100 from FY2033, else 0' },
        { formula: 'rate_a if year < 2035 else rate_b',            result: 'Switch rate mid-model' },
        { formula: 'max(revenue - fixed_cost, 0)',                  result: 'Floor at zero' },
        { formula: 'value * (1.05 if occupancy > 80 else 1.0)',    result: 'Conditional multiplier' },
      ],
      note: 'if/else blocks are not supported. Use: value_if_true if condition else value_if_false',
    },
    {
      title: 'Unit conversions — must be explicit in formula',
      rows: [
        { formula: 'sqft * rate_per_sqft_per_month * 12 / 10000000', result: 'sqft × ₹/sqft/mo → ₹ Cr/yr' },
        { formula: 'bays * rate_per_bay * 12 / 10000000',            result: 'Bays → ₹ Crores/yr' },
        { formula: 'cost_in_lakhs / 100',                             result: '₹ Lakhs → ₹ Crores' },
        { formula: 'cost_in_millions * 0.1',                          result: '₹ Millions → ₹ Crores' },
      ],
      note: 'The Unit field is a label only — the formula must handle all conversions.',
    },
    {
      title: 'Real examples',
      rows: [
        { formula: 'leasable_area * occupancy / 100 * lease_rate * 12 / 10000000', result: 'Annual lease income ₹ Cr' },
        { formula: 'base_cost * (1 + escalation / 100) ** (year - base_year)',      result: 'Escalating cost' },
        { formula: 'min((year - base_year) / ramp_years, 1) * stab_occupancy',      result: 'Linear ramp-up' },
        { formula: 'fixed_cost + variable_cost * units',                             result: 'Fixed + variable' },
      ],
    },
  ];

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <Icon name="formula" size={13} />
        {open ? 'Hide' : 'Show'} Formula Reference
        <Icon name="chevron" size={11}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          marginTop: '0.65rem',
          background: 'var(--blue-pale)', border: '1px solid var(--blue-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.4rem',
          display: 'flex', flexDirection: 'column', gap: '1.1rem',
        }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            Formula Syntax Reference
          </div>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem', fontWeight: 600 }}>
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {sec.rows.map((row) => (
                  <div key={row.formula} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '0.18rem 0.45rem', borderRadius: 4 }}>
                      {row.formula}
                    </code>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{row.result}</span>
                  </div>
                ))}
              </div>
              {sec.note && (
                <div style={{ marginTop: '0.4rem', padding: '0.45rem 0.7rem', background: 'var(--amber-dim)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 4, fontSize: '0.71rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                  ⚠ {sec.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM ROW — inline key editor with auto-generate + manual override
// ─────────────────────────────────────────────────────────────────────────────

function ParamRow({ param, allKeys, onChange, onDelete }) {
  // Whether the user has manually overridden the key
  const [keyLocked, setKeyLocked] = useState(!!param.key);
  const [editingKey, setEditingKey] = useState(false);
  const keyInputRef = useRef(null);

  const handleLabelChange = (label) => {
    if (!keyLocked || !param.key) {
      // Auto-generate key from label
      const otherKeys = allKeys.filter((k) => k !== param.key);
      const autoKey = generateKey(label, otherKeys);
      onChange({ ...param, label, key: autoKey });
    } else {
      onChange({ ...param, label });
    }
  };

  const handleKeyChange = (key) => {
    // Sanitise on the fly: lowercase, underscores only
    const sanitised = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setKeyLocked(true);
    onChange({ ...param, key: sanitised });
  };

  const handleKeyBlur = () => {
    setEditingKey(false);
    if (!param.key) setKeyLocked(false); // if wiped, re-enable auto
  };

  const resetKeyToAuto = () => {
    const otherKeys = allKeys.filter((k) => k !== param.key);
    const autoKey = generateKey(param.label, otherKeys);
    setKeyLocked(false);
    setEditingKey(false);
    onChange({ ...param, key: autoKey });
  };

  const isDuplicateKey = allKeys.filter((k) => k === param.key).length > 1;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 160px 110px 90px auto',
      gap: '0.55rem',
      alignItems: 'start',
      padding: '0.6rem 0',
      borderBottom: '1px solid var(--border)',
    }}>

      {/* ── Label + key ── */}
      <div>
        <input
          className="form-input"
          value={param.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Parameter name"
          style={{ marginBottom: '0.3rem', fontSize: '0.83rem' }}
        />

        {/* Key row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>key:</span>

          {editingKey ? (
            <input
              ref={keyInputRef}
              className="form-input"
              value={param.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              onBlur={handleKeyBlur}
              placeholder="my_key"
              style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '0.15rem 0.4rem', height: 'auto', color: 'var(--blue)', flex: 1 }}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingKey(true)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: isDuplicateKey ? 'var(--red)' : 'var(--blue)',
                background: isDuplicateKey ? 'var(--red-dim)' : 'var(--blue-dim)',
                border: 'none', borderRadius: 3, padding: '0.12rem 0.45rem',
                cursor: 'pointer', textDecoration: 'none',
              }}
              title="Click to manually edit key"
            >
              {param.key || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>auto</span>}
            </button>
          )}

          {isDuplicateKey && (
            <span style={{ fontSize: '0.64rem', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>duplicate!</span>
          )}

          {keyLocked && param.key && !editingKey && (
            <button
              onClick={resetKeyToAuto}
              style={{ fontSize: '0.62rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              title="Reset to auto-generated key"
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* ── Value ── */}
      <input
        className="form-input"
        type="number"
        value={param.value}
        onChange={(e) => onChange({ ...param, value: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}
      />

      {/* ── Unit ── */}
      <div>
        <input
          className="form-input"
          value={param.unit || ''}
          onChange={(e) => onChange({ ...param, unit: e.target.value })}
          placeholder="e.g. %, sqft"
          style={{ fontSize: '0.78rem' }}
        />
        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem', paddingLeft: '0.1rem' }}>
          label only
        </div>
      </div>

      {/* ── Tag (mandatory) ── */}
      <div>
        <input
          className={`form-input${!param.group?.trim() ? ' invalid' : ''}`}
          value={param.group || ''}
          onChange={(e) => onChange({ ...param, group: e.target.value })}
          placeholder="e.g. Revenue"
          style={{ fontSize: '0.76rem' }}
          title="Tag is required — helps you filter and organise parameters"
        />
        {!param.group?.trim() && (
          <div style={{ fontSize: '0.6rem', color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: '0.12rem' }}>required</div>
        )}
      </div>

      {/* ── Delete ── */}
      <button
        className="btn btn-icon btn-ghost btn-sm"
        onClick={() => onDelete()}
        style={{ color: 'var(--muted)', marginTop: '0.15rem' }}
      >
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTIONS PAGE — Parameters only
// ─────────────────────────────────────────────────────────────────────────────

export function AssumptionsPage() {
  const { input, updateInput, save, isComputing, isExample } = useModel();
  const [saving, setSaving]     = useState(false);
  const [activeTag, setActiveTag] = useState('All');

  if (!input) return (
    <AppShell title="Assumptions">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const assumptions = input.assumptions || [];
  const allKeys = assumptions.map((a) => a.key).filter(Boolean);

  const addParam = () => {
    // Pre-populate group with the active tag filter so the new param
    // stays visible and the user doesn't have to re-type the tag
    const defaultGroup = activeTag !== 'All' ? activeTag : '';
    updateInput({ assumptions: [...assumptions, { key: '', label: '', value: 0, unit: '', group: defaultGroup }] });
  };

  const updateParam = (i, updated) => {
    const next = [...assumptions];
    next[i] = updated;
    updateInput({ assumptions: next });
  };

  const deleteParam = (i) => {
    updateInput({ assumptions: assumptions.filter((_, j) => j !== i) });
  };

  // Unique tags across all params
  const allTags = ['All', ...Array.from(new Set(assumptions.map((a) => a.group?.trim()).filter(Boolean))).sort()];
  const visibleAssumptions = activeTag === 'All' ? assumptions : assumptions.filter((a) => a.group?.trim() === activeTag);
  // Index map: visible index → real index (needed for update/delete)
  const visibleIndices = assumptions.map((_, i) => i).filter((i) => activeTag === 'All' || assumptions[i].group?.trim() === activeTag);

  const handleSave = async () => {
    const emptyKeys = assumptions.filter((a) => !a.key?.trim());
    if (emptyKeys.length > 0) {
      toast.error(`${emptyKeys.length} parameter(s) are missing a key — fill in names first.`);
      return;
    }
    const dupKeys = allKeys.filter((k, i) => allKeys.indexOf(k) !== i);
    if (dupKeys.length > 0) {
      toast.error(`Duplicate keys: ${[...new Set(dupKeys)].join(', ')} — all keys must be unique.`);
      return;
    }
    const missingTags = assumptions.filter((a) => !a.group?.trim());
    if (missingTags.length > 0) {
      toast.error(`${missingTags.length} parameter(s) are missing a tag — please add one to each.`);
      return;
    }
    setSaving(true);
    try { await save('Updated parameters'); }
    finally { setSaving(false); }
  };

  return (
    <AppShell
      title="Assumptions"
      actions={!isExample ? (
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
          {saving || isComputing
            ? <><Spinner size={14} /> {isComputing ? 'Computing…' : 'Saving…'}</>
            : <><Icon name="save" size={14} /> Save & Compute</>}
        </button>
      ) : null}
    >
      <FormulaReference />

      {isExample && <ReadOnlyBanner />}

      <div className="card" style={{ pointerEvents: isExample ? 'none' : 'auto', opacity: isExample ? 0.85 : 1 }}>
        <div className="card-header">
          <div>
            <span className="card-title">Parameters</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
              Named values you reference by key in Revenue and Cost formulas.
              Keys auto-generate from the name — click any key to override it manually.
            </div>
          </div>
          {!isExample && <button className="btn btn-secondary btn-sm" onClick={addParam}><Icon name="plus" size={13} /> Add Parameter</button>}
        </div>

        <div style={{ padding: '0 1.5rem' }}>
          {assumptions.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 160px 110px 90px auto',
              gap: '0.55rem', padding: '0.45rem 0',
              fontSize: '0.63rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-3)',
              borderBottom: '1px solid var(--border-2)',
            }}>
              <span>Name / Key</span>
              <span style={{ textAlign: 'right' }}>Value</span>
              <span>Unit</span>
              <span>Tag <span style={{ color: "var(--red)", fontWeight: 700 }}>*</span></span>
              <span />
            </div>
          )}

          {/* Tag filter bar */}
          {allTags.length > 2 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className="btn btn-sm"
                  onClick={() => setActiveTag(tag)}
                  style={{
                    background: activeTag === tag ? 'var(--blue)' : 'var(--surface-3)',
                    color: activeTag === tag ? '#fff' : 'var(--text-3)',
                    border: activeTag === tag ? 'none' : '1px solid var(--border)',
                    fontSize: '0.74rem',
                  }}
                >
                  {tag}
                  {tag !== 'All' && (
                    <span style={{ marginLeft: '0.3rem', opacity: 0.7 }}>
                      ({assumptions.filter((a) => a.group?.trim() === tag).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {assumptions.length === 0 ? (
            <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                No parameters yet. Add named values to use in your Revenue and Cost formulas.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={addParam}>
                <Icon name="plus" size={13} /> Add first parameter
              </button>
            </div>
          ) : (
            visibleAssumptions.length === 0 ? (
              <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                No parameters with tag "{activeTag}" yet.
              </div>
            ) : visibleIndices.map((realIdx, i) => (
              <ParamRow
                key={realIdx}
                param={assumptions[realIdx]}
                allKeys={allKeys}
                onChange={(updated) => updateParam(realIdx, updated)}
                onDelete={() => deleteParam(realIdx)}
              />
            ))
          )}

          {assumptions.length > 0 && (
            <div style={{ padding: '0.65rem 0' }}>
              <button className="btn btn-ghost btn-sm" onClick={addParam}>
                <Icon name="plus" size={13} /> Add parameter
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
