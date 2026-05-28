import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { LoginPage, RegisterPage }                    from './pages/Auth';
import { ProjectsPage }                               from './pages/Projects';
import { AssumptionsPage }                            from './pages/Assumptions';
import { ScenariosPage }                              from './pages/Scenarios';
import { RevenueDriversPage, CostDriversPage }        from './pages/Drivers';
import { CapexPage, DebtPage }                        from './pages/Capex';
import { FinancialsPage, MetricsPage, DashboardPage } from './pages/Outputs';

function RequireAuth({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
}

function RequireGuest({ children }) {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/projects" replace />;
}

// Wraps a page in both auth guard and error boundary
function Page({ auth = true, guest = false, children }) {
  const wrapped = <ErrorBoundary>{children}</ErrorBoundary>;
  if (guest) return <RequireGuest>{wrapped}</RequireGuest>;
  if (auth)  return <RequireAuth>{wrapped}</RequireAuth>;
  return wrapped;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Page guest><LoginPage /></Page>} />
        <Route path="/register" element={<Page guest><RegisterPage /></Page>} />

        {/* Protected — no project context */}
        <Route path="/projects" element={<Page><ProjectsPage /></Page>} />

        {/* Protected — model pages (projectId in URL) */}
        <Route path="/projects/:projectId/assumptions" element={<Page><AssumptionsPage /></Page>} />
        <Route path="/projects/:projectId/scenarios"   element={<Page><ScenariosPage /></Page>} />
        <Route path="/projects/:projectId/capex"       element={<Page><CapexPage /></Page>} />
        <Route path="/projects/:projectId/debt"        element={<Page><DebtPage /></Page>} />
        <Route path="/projects/:projectId/revenue"     element={<Page><RevenueDriversPage /></Page>} />
        <Route path="/projects/:projectId/costs"       element={<Page><CostDriversPage /></Page>} />
        <Route path="/projects/:projectId/financials"  element={<Page><FinancialsPage /></Page>} />
        <Route path="/projects/:projectId/metrics"     element={<Page><MetricsPage /></Page>} />
        <Route path="/projects/:projectId/dashboard"   element={<Page><DashboardPage /></Page>} />

        {/* Fallbacks */}
        <Route path="/"  element={<Navigate to="/projects" replace />} />
        <Route path="*"  element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
