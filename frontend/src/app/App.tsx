import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../core/auth/authStore';
import { AppShell } from './layouts/AppShell';

// Auth Screen
import { LoginPage } from '../features/auth/LoginPage';

// Domain Operational Workspaces
import { CommandOverviewPage } from '../domains/command/CommandOverviewPage';
import { LiveOperationsPage } from '../domains/live/LiveOperationsPage';
import { CameraDetailPage } from '../domains/live/CameraDetailPage';
import { GujaratSituationalMapPage } from '../domains/gis/GujaratSituationalMapPage';
import { AlertCenterPage } from '../domains/alerts/AlertCenterPage';
import { VehicleInvestigationPage } from '../domains/investigation/VehicleInvestigationPage';
import { LiveANPRPage } from '../domains/anpr/LiveANPRPage';
import { WatchlistIntelligencePage } from '../domains/watchlists/WatchlistIntelligencePage';
import { EventExplorerPage } from '../domains/events/EventExplorerPage';
import { IncidentWorkspacePage } from '../domains/incidents/IncidentWorkspacePage';
import { EvidenceVaultPage } from '../domains/evidence/EvidenceVaultPage';
import { CameraRegistryPage } from '../domains/registry/CameraRegistryPage';
import { CoverageGapPage } from '../domains/registry/CoverageGapPage';
import { VMSFederationPage } from '../domains/federation/VMSFederationPage';
import { CentralVMSPage } from '../domains/vms/CentralVMSPage';
import { SystemHealthConsolePage } from '../domains/system/SystemHealthConsolePage';
import { AdminSecurityAuditPage } from '../domains/admin/AdminSecurityAuditPage';
import { OfficialEvaluationDemoPage } from '../domains/demo/OfficialEvaluationDemoPage';

// Overlays
import { Section65BModal } from '../components/common/Section65BModal';

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

          {/* Protected Sentinel Command OS Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<CommandOverviewPage />} />
            <Route path="command" element={<CommandOverviewPage />} />
            <Route path="live" element={<LiveOperationsPage />} />
            <Route path="cameras/:cameraId" element={<CameraDetailPage />} />
            <Route path="map" element={<GujaratSituationalMapPage />} />
            <Route path="alerts" element={<AlertCenterPage />} />
            <Route path="investigate/vehicle" element={<VehicleInvestigationPage />} />
            <Route path="analytics/anpr" element={<LiveANPRPage />} />
            <Route path="watchlists" element={<WatchlistIntelligencePage />} />
            <Route path="events" element={<EventExplorerPage />} />
            <Route path="incidents" element={<IncidentWorkspacePage />} />
            <Route path="evidence" element={<EvidenceVaultPage />} />
            <Route path="registry" element={<CameraRegistryPage />} />
            <Route path="registry/coverage" element={<CoverageGapPage />} />
            <Route path="federation" element={<VMSFederationPage />} />
            <Route path="vms" element={<CentralVMSPage />} />
            <Route path="system/health" element={<SystemHealthConsolePage />} />
            <Route path="admin" element={<AdminSecurityAuditPage />} />
            <Route path="demo" element={<OfficialEvaluationDemoPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Section65BModal />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
