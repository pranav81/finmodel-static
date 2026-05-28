import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useModelStore, useToastStore } from '../../store';

export const Icon = ({ name, size = 16, ...props }) => {
  const paths = {
    home:     <><rect x="3" y="10" width="18" height="11" rx="1"/><path d="M3 10L12 3l9 7"/></>,
    folder:   <><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
    chart:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    table:    <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><rect x="9" y="12" width="6" height="4"/></>,
    coin:     <><circle cx="12" cy="12" r="10"/><path d="M12 6v2M12 16v2M8.5 9.5a3.5 3.5 0 017 0c0 1.9-1.6 3-3.5 3S8.5 13.4 8.5 15.3a3.5 3.5 0 007 0"/></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    layers:   <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    save:     <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    play:     <><polygon points="5 3 19 12 5 21 5 3"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    check:    <><polyline points="20 6 9 17 4 12"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    warning:  <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chevron:  <><polyline points="9 18 15 12 9 6"/></>,
    formula:  <><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="14" y2="18"/></>,
    scenario: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
      strokeLinejoin="round" style={{ flexShrink:0 }} {...props}>
      {paths[name] || null}
    </svg>
  );
};

const NAV = [
  { section: 'Workspace' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { section: 'Inputs', projectRequired: true },
  { to: 'assumptions', label: 'Assumptions', icon: 'settings', project: true },
  { to: 'scenarios',   label: 'Scenarios',   icon: 'scenario', project: true },
  { to: 'capex',       label: 'CAPEX',       icon: 'building', project: true },
  { to: 'debt',        label: 'Debt',        icon: 'coin',     project: true },
  { to: 'revenue',     label: 'Revenue',     icon: 'trending', project: true },
  { to: 'costs',       label: 'Costs',       icon: 'layers',   project: true },
  { section: 'Outputs', projectRequired: true },
  { to: 'financials',  label: 'Financials',  icon: 'table',    project: true },
  { to: 'overview',    label: 'Overview',    icon: 'chart',    project: true },
];

export function Sidebar() {
  const projectId   = useModelStore((s) => s.projectId);
  const projectName = useModelStore((s) => s.projectName);
  const navigate    = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-word">Financials<span> Projector</span></div>
        <div className="logo-sub" style={{ fontSize:'0.62rem',color:'var(--sidebar-muted)',marginTop:'0.2rem',fontFamily:'var(--font-mono)',letterSpacing:'0.08em' }}>
          Offline · No account needed
        </div>
      </div>
      <nav style={{ flex:1,overflowY:'auto' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            if (item.projectRequired && !projectId) return null;
            return (
              <div key={i} className="nav-section">
                <div className="nav-section-label">{item.section}</div>
              </div>
            );
          }
          if (item.projectRequired && !projectId) return null;
          const href = item.project && projectId
            ? `/projects/${projectId}/${item.to}`
            : item.to;
          return (
            <NavLink key={i} to={href}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon name={item.icon} size={15} className="nav-icon" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppShell({ children, title, actions }) {
  const projectName = useModelStore((s) => s.projectName);
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="page-header">
          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',minWidth:0 }}>
            {projectName && (
              <>
                <span style={{ fontFamily:'var(--font-display)',fontSize:'0.95rem',fontWeight:400,color:'var(--text-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:240 }}>
                  {projectName}
                </span>
                <span style={{ color:'var(--border-2)',fontSize:'1rem' }}>/</span>
              </>
            )}
            <h4 style={{ fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:400,whiteSpace:'nowrap' }}>
              {title}
            </h4>
          </div>
          <div style={{ marginLeft:'auto',display:'flex',gap:'0.5rem',alignItems:'center',flexShrink:0 }}>
            {actions}
          </div>
        </header>
        <div className="page-body page-enter">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
          {t.type === 'success' && <Icon name="check" size={14} style={{ color:'var(--green)',flexShrink:0 }} />}
          {t.type === 'error'   && <Icon name="warning" size={14} style={{ color:'var(--red)',flexShrink:0 }} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 18 }) {
  return <div className="spinner" style={{ width:size,height:size }} />;
}

export function EmptyState({ icon='folder', title, description, action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={40} style={{ color:'var(--muted)',opacity:0.4 }} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,backdropFilter:'blur(4px)' }}>
      <div className="card" style={{ maxWidth:420,padding:'1.5rem' }}>
        <p style={{ marginBottom:'1.25rem',color:'var(--text-2)',lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex',gap:'0.5rem',justifyContent:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export function ReadOnlyBanner() {
  return (
    <div style={{
      background: 'var(--blue-pale)', border: '1px solid var(--blue-border)',
      borderRadius: 'var(--radius)', padding: '0.6rem 1rem', marginBottom: '1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      fontSize: '0.82rem', color: 'var(--blue)',
    }}>
      <Icon name="folder" size={14} style={{ flexShrink: 0 }} />
      <span><strong>Read Only.</strong> This project cannot be edited.</span>
    </div>
  );
}
