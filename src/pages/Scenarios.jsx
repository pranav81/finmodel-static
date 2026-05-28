import { useState } from 'react';
import { AppShell, Icon, Spinner, SectionTitle } from '../components/ui';
import { useModel } from '../hooks/useModel';
import { toast } from '../store';

// ─────────────────────────────────────────────────────────────────────────────
// OVERRIDE ROW
// ─────────────────────────────────────────────────────────────────────────────

function OverrideRow({ override, assumptions, onChange, onDelete }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 130px 110px auto',
      gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Parameter key selector */}
      <select
        className="form-input"
        value={override.key}
        onChange={(e) => onChange({ ...override, key: e.target.value })}
        style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
      >
        <option value="">— select parameter —</option>
        {assumptions.map((a) => (
          <option key={a.key} value={a.key}>
            {a.key} ({a.value}{a.unit ? ' ' + a.unit : ''})
          </option>
        ))}
      </select>

      {/* Mode */}
      <select
        className="form-input"
        value={override.mode}
        onChange={(e) => onChange({ ...override, mode: e.target.value })}
        style={{ fontSize: '0.8rem' }}
      >
        <option value="absolute">Absolute</option>
        <option value="delta_pct">± %</option>
        <option value="delta_abs">± Value</option>
      </select>

      {/* Value */}
      <input
        type="number"
        className="form-input"
        value={override.value}
        onChange={(e) => onChange({ ...override, value: parseFloat(e.target.value) || 0 })}
        style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
      />

      <button className="btn btn-icon btn-ghost btn-sm"
        onClick={onDelete} style={{ color: 'var(--muted)' }}>
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CARD — collapsible, fully editable
// ─────────────────────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, assumptions, isActive, onSwitch, onChange, onDelete, isComputing }) {
  const [open, setOpen] = useState(false);

  const addOverride = () => {
    onChange({ ...scenario, overrides: [...(scenario.overrides || []), { key: '', mode: 'absolute', value: 0 }] });
  };

  const updateOverride = (i, updated) => {
    const next = [...scenario.overrides];
    next[i] = updated;
    onChange({ ...scenario, overrides: next });
  };

  const deleteOverride = (i) => {
    onChange({ ...scenario, overrides: scenario.overrides.filter((_, j) => j !== i) });
  };

  const isBase = scenario.id === 'base';

  return (
    <div style={{
      border: `1px solid ${isActive ? 'var(--blue-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      background: isActive ? 'var(--blue-pale)' : 'var(--surface)',
      overflow: 'hidden',
      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.85rem 1rem',
      }}>
        {/* Expand/collapse */}
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={() => setOpen(!open)}
          style={{ color: 'var(--text-3)', flexShrink: 0 }}
        >
          <Icon name="chevron" size={13}
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* Label — editable inline */}
        <input
          className="form-input"
          value={scenario.label}
          onChange={(e) => onChange({ ...scenario, label: e.target.value })}
          style={{
            flex: 1, background: 'transparent', border: 'none', padding: 0,
            fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', outline: 'none',
          }}
        />

        {/* Override count badge */}
        {(scenario.overrides?.length || 0) > 0 && (
          <span className="badge badge-blue" style={{ flexShrink: 0 }}>
            {scenario.overrides.length} override{scenario.overrides.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Active indicator */}
        {isActive && (
          <span className="badge badge-green" style={{ flexShrink: 0 }}>Active</span>
        )}

        {/* Switch button */}
        {!isActive && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onSwitch(scenario.id)}
            disabled={isComputing}
            style={{ flexShrink: 0 }}
          >
            {isComputing ? <Spinner size={11} /> : 'Switch'}
          </button>
        )}

        {/* Delete — not available for base */}
        {!isBase && (
          <button
            className="btn btn-icon btn-ghost btn-sm"
            onClick={() => onDelete(scenario.id)}
            style={{ color: 'var(--muted)', flexShrink: 0 }}
          >
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>

      {/* Expanded editor */}
      {open && (
        <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {/* Description */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
            <input
              className="form-input"
              value={scenario.description || ''}
              onChange={(e) => onChange({ ...scenario, description: e.target.value })}
              placeholder="e.g. Higher tariff, lower O&M"
            />
          </div>

          {/* Overrides */}
          {isBase ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Base Case uses all parameters at their default values. No overrides needed.
            </div>
          ) : (
            <>
              {/* Column headers */}
              {(scenario.overrides?.length || 0) > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 130px 110px auto',
                  gap: '0.5rem', padding: '0.2rem 0',
                  fontSize: '0.63rem', fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)',
                  borderBottom: '1px solid var(--border-2)',
                }}>
                  <span>Parameter</span>
                  <span>Mode</span>
                  <span style={{ textAlign: 'right' }}>Value</span>
                  <span />
                </div>
              )}

              {(scenario.overrides || []).map((ov, i) => (
                <OverrideRow
                  key={i}
                  override={ov}
                  assumptions={assumptions}
                  onChange={(updated) => updateOverride(i, updated)}
                  onDelete={() => deleteOverride(i)}
                />
              ))}

              <button
                className="btn btn-ghost btn-sm"
                onClick={addOverride}
                style={{ marginTop: '0.5rem' }}
              >
                <Icon name="plus" size={13} /> Add override
              </button>

              {(scenario.overrides?.length || 0) === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  No overrides yet — this scenario is identical to Base Case. Add overrides above.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW SCENARIO MODAL
// ─────────────────────────────────────────────────────────────────────────────

function NewScenarioModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ label: '', description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    onCreate({
      id: `scenario_${Date.now()}`,
      label: form.label.trim(),
      description: form.description.trim(),
      overrides: [],
      is_default: false,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, backdropFilter: 'blur(6px)',
    }}>
      <div className="card" style={{ width: 420, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3>New Scenario</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">Label *</label>
            <input className="form-input" placeholder="e.g. Bull Case"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="e.g. Higher tariff, lower costs"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Icon name="plus" size={14} /> Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function ScenariosPage() {
  const { input, updateInput, save, activeScenarioId, switchScenario, isComputing, isExample } = useModel();
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving]   = useState(false);

  if (!input) return (
    <AppShell title="Scenarios">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
    </AppShell>
  );

  const scenarios   = input.scenarios || [];
  const assumptions = input.assumptions || [];

  const updateScenario = (updatedScenario) => {
    const next = scenarios.map((s) => s.id === updatedScenario.id ? updatedScenario : s);
    updateInput({ scenarios: next });
  };

  const deleteScenario = (id) => {
    updateInput({ scenarios: scenarios.filter((s) => s.id !== id) });
    if (activeScenarioId === id) switchScenario('base');
  };

  const addScenario = (newScenario) => {
    updateInput({ scenarios: [...scenarios, newScenario] });
  };

  const handleSave = async () => {
    setSaving(true);
    try { await save('Updated scenarios'); }
    finally { setSaving(false); }
  };

  return (
    <AppShell
      title="Scenarios"
      actions={!isExample ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={13} /> New Scenario
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || isComputing}>
            {saving || isComputing ? <Spinner size={14} /> : <><Icon name="save" size={14} /> Save & Compute</>}
          </button>
        </div>
      ) : null}
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Scenarios let you compare the model under different assumptions. Click any scenario card to expand and edit its overrides. Switch between scenarios on the output pages to see how metrics change.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {scenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            assumptions={assumptions}
            isActive={activeScenarioId === s.id}
            onSwitch={switchScenario}
            onChange={updateScenario}
            onDelete={deleteScenario}
            isComputing={isComputing}
          />
        ))}
      </div>

      {scenarios.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          No scenarios yet.
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: '0.75rem' }}
            onClick={() => setShowNew(true)}>
            <Icon name="plus" size={13} /> Add one
          </button>
        </div>
      )}

      {showNew && <NewScenarioModal onClose={() => setShowNew(false)} onCreate={addScenario} />}
    </AppShell>
  );
}
