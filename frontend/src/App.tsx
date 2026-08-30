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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

          {/* Protected Police Console Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            <Route index element={<CommandDashboard />} />
            <Route path="live-wall" element={<LiveVideoWallPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="investigate" element={<InvestigatePage />} />
            <Route path="cameras" element={<CameraManagementPage />} />
            <Route path="watchlists" element={<WatchlistsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
