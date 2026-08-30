import React from 'react';
import { useRealtimeStore } from '../../core/realtime/websocketService';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { Radio, Activity, ShieldAlert, Car, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const EventRail: React.FC = () => {
  const { events } = useRealtimeStore();
  const { openVehicleDrawer, openCameraDrawer } = useContextDrawerStore();

  return (
    <div className="h-10 bg-[#070b14] border-t border-slate-800 px-4 flex items-center justify-between z-30 select-none font-mono text-[11px]">
      {/* Live Pulse Label */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-800 shrink-0">
        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="font-bold text-slate-300">REAL-TIME EVENT STREAM</span>
      </div>

      {/* Horizontal Scrolling Events */}
      <div className="flex-1 flex items-center gap-4 overflow-x-auto px-3 scrollbar-none">
        {events.slice(0, 8).map((ev) => (
          <div
            key={ev.id}
            onClick={() => {
              if (ev.identifier) openVehicleDrawer(ev.identifier);
            }}
            className="flex items-center gap-1.5 shrink-0 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            <span className="text-slate-500 text-[10px]">{ev.timestamp}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                ev.severity === 'CRITICAL'
                  ? 'bg-red-400 animate-ping'
                  : ev.severity === 'HIGH'
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span className="text-slate-300 font-semibold">{ev.title}</span>
          </div>
        ))}
      </div>

      {/* Infrastructure Summary Pill */}
      <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 shrink-0 text-[10px] text-slate-400">
        <span className="text-emerald-400 font-bold">● 98.8% HEALTHY</span>
        <span>|</span>
        <span>50 LIVE SANDBOX</span>
      </div>
    </div>
  );
};
