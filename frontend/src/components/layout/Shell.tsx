import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { websocketService } from '../../services/websocketService';
import { Section65BModal } from '../common/Section65BModal';
import { CommandPalette } from '../common/CommandPalette';

export const Shell: React.FC = () => {
  useEffect(() => {
    // Initialize real-time WebSocket event connection
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#060913] via-[#070c18] to-[#060913] p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Section 65B Court Evidence Modal */}
      <Section65BModal />

      {/* Global Tactical Command Palette & Hotkeys */}
      <CommandPalette />
    </div>
  );
};
