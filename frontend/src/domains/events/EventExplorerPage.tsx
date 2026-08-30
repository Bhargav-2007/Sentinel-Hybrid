import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { Activity, Search, Filter, ArrowRight, ExternalLink } from 'lucide-react';

export const EventExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const { openVehicleDrawer, openCameraDrawer } = useContextDrawerStore();
  const [searchTerm, setSearchTerm] = useState('');

  const events = [
    { time: '15:42:28', type: 'ANPR', camera: 'CAM-042', location: 'Ahmedabad (SG Highway)', conf: '97.4%', plate: 'GJ01AB1234' },
    { time: '15:39:11', type: 'VEHICLE', camera: 'CAM-019', location: 'Surat (Ring Road)', conf: '94.1%', plate: 'GJ05CD5678' },
    { time: '15:35:04', type: 'ANPR', camera: 'CAM-008', location: 'Gandhinagar (Koba Circle)', conf: '96.2%', plate: 'GJ27XY9900' },
    { time: '15:30:19', type: 'PERSON', camera: 'CAM-027', location: 'Ahmedabad (Iskcon Flyover)', conf: '91.8%', plate: 'PERSON-109' },
    { time: '15:22:45', type: 'ANPR', camera: 'CAM-035', location: 'Vadodara (Alkapuri)', conf: '95.4%', plate: 'GJ06GH3322' },
  ];

  const filtered = events.filter((e) => 
    e.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.camera.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Header & Filter Bar */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              CENTRAL EVENT EXPLORER & AI TELEMETRY STREAM
            </h1>
            <p className="text-[10px] text-slate-400 font-sans">
              Universal Query Engine for ANPR, Vehicle Tracks, and Security Anomalies
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plate, camera, district..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Events Data Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">TIMESTAMP</th>
                <th className="p-3.5">EVENT TYPE</th>
                <th className="p-3.5">CAMERA</th>
                <th className="p-3.5">LOCATION / DISTRICT</th>
                <th className="p-3.5">TARGET / PLATE</th>
                <th className="p-3.5">CONFIDENCE</th>
                <th className="p-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((ev, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors font-mono">
                  <td className="p-3.5 text-slate-300">{ev.time} IST</td>
                  <td className="p-3.5">
                    <span className="bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      {ev.type}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-200">{ev.camera}</td>
                  <td className="p-3.5 text-slate-300 font-sans">{ev.location}</td>
                  <td 
                    onClick={() => openVehicleDrawer(ev.plate)}
                    className="p-3.5 font-bold text-yellow-300 hover:underline cursor-pointer"
                  >
                    {ev.plate}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-400">{ev.conf}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => navigate(`/investigate/vehicle?plate=${ev.plate}`)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 text-slate-200 font-bold text-[10px] transition-colors"
                    >
                      OPEN TRACE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
