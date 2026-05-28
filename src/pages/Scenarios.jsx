import { useState } from 'react';
import { AppShell, Icon, SectionTitle, Spinner, ReadOnlyBanner } from '../components/ui';
import { useModel } from '../hooks/useModel';
import { toast } from '../store';

function ScenarioCard({ scenario, assumptions, onEdit, onDelete, isActive, onSetActive }) {
  return (
    <div className="card" style={{
      borderColor: isActive ? 'var(--gold)' : 'var(--border)',
      transition: 'border-color 0.2s',
    }}>
      <div className="card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{scenario.label}</span>
            {isActive && <span className="badge badge-gold">Active</span>}
            {scenario.is_default && <span className="badge badge-neutral">Default</span>}
          </div>
          {scenario.description && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{scenario.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {!isActive && (
            <button className="btn btn-secondary btn-sm" onClick={() => onSetActive(scenario.id)}>
              Set Active
            </button>
          )}
          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onEdit(scenario)}>
            <Icon name="edit" size={13} />
          </button>
          {!scenario.is_default && (
            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onDelete(scenario.id)}
              style={{ color: 'var(--muted)' }}>
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '1rem 1.5rem' }}>
        {scenario.overrides.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            No overrides — uses base assumptions as-is.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {scenario.overrides.map((ov, i) => {
              const param = assumptions.find((a) => a.key === ov.key);
              const sign = ov.value >= 0 ? '+' : '';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ color: 'var(--text-2)', minWidth: 220 }}>
                    {param?.label || ov.key}
                  </span>
                  <span style={{
                    color: ov.value >= 0 ? 'var(--green)' : 'var(--red)',
                    fontWeight: 500,
                  }}>
                    {ov.mode === 'delta_pct'
                      ? `${sign}${ov.value}%`
                      : `= ${ov.value} (absolute)`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioEditor({ scenario, assumptions, onSave, onClose }) {
  const [form, setForm] = useState(scenario
    ? { ...scenario, overrides: [...scenario.overrides.map((o) => ({ ...o }))] }
    : { id: '', label: '', description: '', overrides: [], is_default: false }
  );
  const isNew = !scenario;

  const addOverride = () => {
    setForm((f) => ({
      ...f,
      overrides: [...f.overrides, { key: assumptions[0]?.key || '', mode: 'delta_pct', value: 0 }],
    }));
  };

  const updateOverride = (i, patch) => {
    setForm((f) => {
      const overrides = [...f.overrides];
      overrides[i] = { ...overrides[i], ...patch };
      return { ...f, overrides };
    });
  };

  const removeOverride = (i) => {
    setForm((f) => ({ ...f, overrides: f.overrides.filter((_, j) => j !== i) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = form.id || form.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!id || !form.label) return toast.error('Label is required');
    onSave({ ...form, id });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, backdropFilter: 'blur(6px)', padding: '2rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <h3>{isNew ? 'New Scenario' : `Edit: ${scenario.label}`}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Scenario Label *</label>
                <input className="form-input" value={form.label} placeholder="e.g. Base Case"
                  onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">ID <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(auto if blank)</span></label>
                <input className="form-input" value={form.id} placeholder="base_case"
                  onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  disabled={!isNew} style={{ opacity: isNew ? 1 : 0.5 }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <input className="form-input" value={form.description} placeholder="Brief description of this scenario"
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <SectionTitle>Assumption Overrides</SectionTitle>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addOverride}>
                <Icon name="plus" size={13} /> Add Override
              </button>
            </div>

            {form.overrides.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.75rem 0' }}>
                No overrides. This scenario uses all base assumptions unchanged.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto',
                  gap: '0.5rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)',
                }}>
                  <span>Parameter</span><span>Mode</span><span>Value</span><span />
                </div>

                {form.overrides.map((ov, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <select className="form-input" value={ov.key}
                      onChange={(e) => updateOverride(i, { key: e.target.value })}
                      style={{ fontSize: '0.8rem' }}>
                      {assumptions.map((a) => (
                        <option key={a.key} value={a.key}>{a.label}</option>
                      ))}
                    </select>
                    <select className="form-input" value={ov.mode}
                      onChange={(e) => updateOverride(i, { mode: e.target.value })}
                      style={{ fontSize: '0.78rem' }}>
                      <option value="delta_pct">% change</option>
                      <option value="absolute">Absolute</option>
                    </select>
                    <input className="form-input" type="number" value={ov.value}
                      onChange={(e) => updateOverride(i, { value: parseFloat(e.target.value) || 0 })}
                      style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                      placeholder={ov.mode === 'delta_pct' ? '% e.g. -10' : 'value'} />
                    <button type="button" className="btn btn-icon btn-ghost btn-sm"
                      onClick={() => removeOverride(i)} style={{ color: 'var(--muted)' }}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">
              {isNew ? 'Create Scenario' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ScenariosPage() {
  const { input, updateInput, save, activeScenarioId, switchScenario, isComputing, isExample } = useModel();
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!input) return <AppShell title="Scenarios"><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div></AppShell>;

  const scenarios = input.scenarios || [];
  const assumptions = input.assumptions || [];

  const handleSave = (updated) => {
    const existing = scenarios.find((s) => s.id === updated.id);
    const next = existing
      ? scenarios.map((s) => s.id === updated.id ? updated : s)
      : [...scenarios, updated];
    updateInput({ scenarios: next });
    setEditing(null);
    setShowNew(false);
    toast.success(existing ? 'Scenario updated' : 'Scenario created');
  };

  const handleDelete = (id) => {
    updateInput({ scenarios: scenarios.filter((s) => s.id !== id) });
    toast.success('Scenario removed');
  };

  const handleSetActive = async (id) => {
    setSaving(true);
    try { await switchScenario(id); }
    finally { setSaving(false); }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try { await save('Updated scenarios'); }
    finally { setSaving(false); }
  };

  return (
    <AppShell
      title="Scenarios"
      actions={
        <>
          {!isExample && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={14} /> New Scenario
            </button>
          )}
          {!isExample && (
            <button className="btn btn-primary btn-sm" onClick={handleSaveAll} disabled={saving || isComputing}>
              {saving || isComputing ? <Spinner size={14} /> : <><Icon name="save" size={14} /> Save & Compute</>}
            </button>
          )}
        </>
      }
    >
      {isExample && <ReadOnlyBanner />}
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Define Base, Bull, Bear (or any custom) scenarios. Each overrides specific assumption values
        by a % delta or absolute replacement. Switch the active scenario to recompute outputs.
      </p>

      {/* Active scenario switcher */}
      {scenarios.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>Active Scenario</SectionTitle>
          <div className="scenario-bar" style={{ display: 'inline-flex' }}>
            {scenarios.map((s) => (
              <button
                key={s.id}
                className={`scenario-option${activeScenarioId === s.id ? ' active' : ''}`}
                onClick={() => handleSetActive(s.id)}
                disabled={isComputing}
              >
                {isComputing && activeScenarioId === s.id ? <Spinner size={11} /> : s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {scenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            assumptions={assumptions}
            isActive={activeScenarioId === s.id}
            onEdit={setEditing}
            onDelete={handleDelete}
            onSetActive={handleSetActive}
          />
        ))}
      </div>

      {(editing || showNew) && (
        <ScenarioEditor
          scenario={editing}
          assumptions={assumptions}
          onSave={handleSave}
          onClose={() => { setEditing(null); setShowNew(false); }}
        />
      )}
    </AppShell>
  );
}
