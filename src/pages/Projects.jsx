import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModelStore, toast } from '../store';
import { AppShell, Icon, Spinner, EmptyState, ConfirmDialog } from '../components/ui';
import { getProjects, createProject, deleteProject, importModel, exportModel } from '../lib/storage';

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', client: '', currency: 'INR Crores', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    const p = createProject(form);
    onCreate(p);
    onClose();
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, backdropFilter: 'blur(6px)',
    }}>
      <div className="card" style={{ width: 480, padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3>New Project</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Project name *</label>
              <input className="form-input" placeholder="e.g. Mixed-Use Development Phase 1"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Client</label>
              <input className="form-input" value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-input" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option>INR Crores</option>
                <option>USD Millions</option>
                <option>EUR Millions</option>
                <option>GBP Millions</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              <Icon name="plus" size={14} /> Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete, onExport }) {
  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
      onClick={() => onOpen(project)}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      <div className="card-header">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{project.name}</div>
          {project.client && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{project.client}</div>}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span className="badge badge-neutral">{project.currency}</span>
          <button className="btn btn-icon btn-ghost btn-sm" title="Export JSON"
            onClick={(e) => { e.stopPropagation(); onExport(project); }}
            style={{ color: 'var(--muted)' }}>
            <Icon name="download" size={13} />
          </button>
          <button className="btn btn-icon btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); onDelete(project); }}
            style={{ color: 'var(--muted)' }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
      {project.description && (
        <div className="card-body" style={{ padding: '0.75rem 1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: 0 }}>{project.description}</p>
        </div>
      )}
    </div>
  );
}

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [showNew, setShowNew]   = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const navigate                = useNavigate();

  useEffect(() => {
    setProjects(getProjects());
    // Clear any stale project state
    useModelStore.getState().reset();
  }, []);

  const handleOpen = (project) => {
    useModelStore.getState().setProject(project.id, project.name, false);
    navigate(`/projects/${project.id}/assumptions`);
  };

  const handleDelete = () => {
    deleteProject(toDelete.id);
    setProjects(getProjects());
    toast.success('Project deleted');
    setToDelete(null);
  };

  const handleExport = (project) => {
    exportModel(project.id);
    toast.success('Exported');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = await importModel(file);
      setProjects(getProjects());
      toast.success(`Imported: ${p.name}`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    }
    e.target.value = '';
  };

  return (
    <AppShell
      title="Projects"
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="download" size={14} /> Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={14} /> New Project
          </button>
        </div>
      }
    >
      {/* Storage notice */}
      <div style={{
        background: 'var(--blue-pale)', border: '1px solid var(--blue-border)',
        borderRadius: 'var(--radius)', padding: '0.65rem 1rem',
        marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--blue)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <Icon name="folder" size={14} />
        Models are saved in your browser. Use the <strong>↓ Export</strong> button on each project to save a JSON file to your computer.
      </div>

      {projects.length === 0 ? (
        <EmptyState icon="folder" title="No projects yet"
          description="Create a new financial model or import one from a JSON file."
          action={<button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={15} /> Create Project</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p}
              onOpen={handleOpen} onDelete={setToDelete} onExport={handleExport} />
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)}
        onCreate={(p) => { setProjects(getProjects()); toast.success('Project created'); }} />}

      {toDelete && <ConfirmDialog
        message={`Delete "${toDelete.name}"? This removes it from this browser only.`}
        onConfirm={handleDelete} onCancel={() => setToDelete(null)} />}
    </AppShell>
  );
}
