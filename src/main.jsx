import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EngineLoader } from './components/EngineLoader';
import { ProjectsPage } from './pages/Projects';
import './index.css';

// Lazy load heavy pages
const AssumptionsPage    = React.lazy(() => import('./pages/Assumptions').then(m => ({ default: m.AssumptionsPage })));
const ScenariosPage      = React.lazy(() => import('./pages/Scenarios').then(m => ({ default: m.ScenariosPage })));
const CapexPage          = React.lazy(() => import('./pages/Capex').then(m => ({ default: m.CapexPage })));
const DebtPage           = React.lazy(() => import('./pages/Capex').then(m => ({ default: m.DebtPage })));
const RevenueDriversPage = React.lazy(() => import('./pages/Drivers').then(m => ({ default: m.RevenueDriversPage })));
const CostDriversPage    = React.lazy(() => import('./pages/Drivers').then(m => ({ default: m.CostDriversPage })));
const FinancialsPage     = React.lazy(() => import('./pages/Outputs').then(m => ({ default: m.FinancialsPage })));
const OverviewPage       = React.lazy(() => import('./pages/Overview').then(m => ({ default: m.OverviewPage })));

function App() {
  return (
    <HashRouter>
      <EngineLoader>
        <React.Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId/assumptions"  element={<AssumptionsPage />} />
            <Route path="/projects/:projectId/scenarios"    element={<ScenariosPage />} />
            <Route path="/projects/:projectId/capex"        element={<CapexPage />} />
            <Route path="/projects/:projectId/debt"         element={<DebtPage />} />
            <Route path="/projects/:projectId/revenue"      element={<RevenueDriversPage />} />
            <Route path="/projects/:projectId/costs"        element={<CostDriversPage />} />
            <Route path="/projects/:projectId/financials"   element={<FinancialsPage />} />
            <Route path="/projects/:projectId/overview"     element={<OverviewPage />} />
            {/* Legacy redirects */}
            <Route path="/projects/:projectId/metrics"   element={<Navigate to="overview" replace />} />
            <Route path="/projects/:projectId/dashboard" element={<Navigate to="overview" replace />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </React.Suspense>
      </EngineLoader>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
