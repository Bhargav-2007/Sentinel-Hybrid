import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ContextDrawer } from './ContextDrawer';
import { CommandPalette } from './CommandPalette';
import { EmergencyInterceptBanner } from './EmergencyInterceptBanner';
import { useAuthStore } from '../../core/auth/authStore';

export const Layout: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col font-sans overflow-hidden">
      <Topbar />
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0d1117] p-4 relative">
          <Outlet />
        </main>
        <ContextDrawer />
      </div>
      <CommandPalette />
      <EmergencyInterceptBanner />
    </div>
  );
};
