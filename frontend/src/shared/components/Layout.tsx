import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ContextDrawer } from './ContextDrawer';
import { CommandPalette } from './CommandPalette';
import { EmergencyInterceptBanner } from './EmergencyInterceptBanner';
import { useAuthStore } from '../../core/auth/authStore';

export const Layout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-sentinel-950 text-slate-100 flex flex-col font-sans">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-tactical-grid p-4 relative">
          <Outlet />
        </main>
        <ContextDrawer />
      </div>
      <CommandPalette />
      <EmergencyInterceptBanner />
    </div>
  );
};
