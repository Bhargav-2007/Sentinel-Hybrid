import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../shared/components/Layout';
import { LiveOperationsPage } from '../features/live-operations/LiveOperationsPage';
import { InvestigationPage } from '../features/investigation/InvestigationPage';
import { StatewideMapPage } from '../features/gis/StatewideMapPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { CasesPage } from '../features/cases/CasesPage';
import { CameraManagementPage } from '../features/cameras/CameraManagementPage';
import { WatchlistsPage } from '../features/watchlists/WatchlistsPage';
import { SystemStatusPage } from '../features/system-status/SystemStatusPage';
import { UserManagementPage } from '../features/users/UserManagementPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { HelpDocsPage } from '../features/help/HelpDocsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RoleGuard } from '../core/auth/RoleGuard';
import { PERMISSIONS } from '../core/auth/permissions';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/live" replace />,
      },
      {
        path: 'live',
        element: <LiveOperationsPage />,
      },
      {
        path: 'investigate',
        element: (
          <RoleGuard roles={PERMISSIONS.VIEW_INVESTIGATION_DOSSIER} fallback={<Navigate to="/live" replace />}>
            <InvestigationPage />
          </RoleGuard>
        ),
      },
      {
        path: 'map',
        element: <StatewideMapPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
      },
      {
        path: 'cases',
        element: (
          <RoleGuard roles={PERMISSIONS.CREATE_CASE} fallback={<Navigate to="/live" replace />}>
            <CasesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'cameras',
        element: <CameraManagementPage />,
      },
      {
        path: 'watchlists',
        element: (
          <RoleGuard roles={PERMISSIONS.MANAGE_WATCHLISTS} fallback={<Navigate to="/live" replace />}>
            <WatchlistsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'watchlist',
        element: <Navigate to="/watchlists" replace />,
      },
      {
        path: 'audit',
        element: <Navigate to="/system-status" replace />,
      },
      {
        path: 'analytics',
        element: <Navigate to="/system-status" replace />,
      },
      {
        path: 'system-status',
        element: <SystemStatusPage />,
      },
      {
        path: 'users',
        element: (
          <RoleGuard roles={PERMISSIONS.MANAGE_USERS} fallback={<Navigate to="/live" replace />}>
            <UserManagementPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'help',
        element: <HelpDocsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/live" replace />,
      },
    ],
  },
]);
