import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { Shell } from './components/layout/Shell';

// Primary Screens
import { LoginPage } from './features/auth/LoginPage';
import { CommandDashboard } from './features/dashboard/CommandDashboard';
import { LiveVideoWallPage } from './features/live-wall/LiveVideoWallPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { VehicleSearchPage } from './features/search/VehicleSearchPage';
import { PersonSearchPage } from './features/search/PersonSearchPage';
import { GISMapPage } from './features/gis/GISMapPage';
import { CasesPage } from './features/cases/CasesPage';
import { EvidenceManagementPage } from './features/evidence/EvidenceManagementPage';
import { InvestigatePage } from './features/investigate/InvestigatePage';
import { CameraManagementPage } from './features/cameras/CameraManagementPage';
import { WatchlistsPage } from './features/watchlists/WatchlistsPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { AdminPage } from './features/admin/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Police Operations Console */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            {/* 1. Dashboard ("What is happening right now?") */}
            <Route index element={<CommandDashboard />} />

            {/* 2. Live Monitoring */}
            <Route
              path="live-wall"
              element={
                <ProtectedRoute requiredPermission="camera.read">
                  <LiveVideoWallPage />
                </ProtectedRoute>
              }
            />

            {/* 3. Alerts */}
            <Route
              path="alerts"
              element={
                <ProtectedRoute requiredPermission="alert.read">
                  <AlertsPage />
                </ProtectedRoute>
              }
            />

            {/* 4. Vehicle Search */}
            <Route
              path="vehicles"
              element={
                <ProtectedRoute requiredPermission="vehicle.search">
                  <VehicleSearchPage />
                </ProtectedRoute>
              }
            />

            {/* 5. Person Search */}
            <Route
              path="persons"
              element={
                <ProtectedRoute requiredPermission="person.search">
                  <PersonSearchPage />
                </ProtectedRoute>
              }
            />

            {/* 6. GIS Map */}
            <Route
              path="gis"
              element={
                <ProtectedRoute requiredPermission="camera.read">
                  <GISMapPage />
                </ProtectedRoute>
              }
            />

            {/* 7. Investigation / Cases */}
            <Route
              path="cases"
              element={
                <ProtectedRoute requiredPermission="case.create">
                  <CasesPage />
                </ProtectedRoute>
              }
            />

            {/* 8. Evidence Management */}
            <Route
              path="evidence"
              element={
                <ProtectedRoute requiredPermission="evidence.read">
                  <EvidenceManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Supplementary Operational Views */}
            <Route path="investigate" element={<InvestigatePage />} />
            <Route path="cameras" element={<CameraManagementPage />} />
            <Route path="watchlists" element={<WatchlistsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredPermission="camera.manage">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
