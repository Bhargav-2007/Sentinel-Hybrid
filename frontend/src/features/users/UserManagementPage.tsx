import React from 'react';
import { Users, UserPlus, Shield, CheckCircle, Lock } from 'lucide-react';
import { OfficerUser } from '../../core/types/auth';

export const UserManagementPage: React.FC = () => {
  const officers: OfficerUser[] = [
    {
      id: 'off-01',
      badge_number: 'GJ-POL-8842',
      full_name: 'Inspector R.K. Jadeja',
      role: 'INVESTIGATOR',
      rank: 'Police Inspector (PI)',
      station: 'Navrangpura Police Station',
      district: 'Ahmedabad City',
      email: 'rk.jadeja@gujaratpolice.gov.in',
      is_active: true,
      last_login: '2026-09-01 11:20:00 IST',
    },
    {
      id: 'off-02',
      badge_number: 'GJ-POL-1002',
      full_name: 'DGP K.S. Rathore',
      role: 'ADMIN',
      rank: 'Director General of Police',
      station: 'State Police Headquarters, Gandhinagar',
      district: 'Gandhinagar',
      email: 'dgp@gujaratpolice.gov.in',
      is_active: true,
      last_login: '2026-09-01 09:15:00 IST',
    },
    {
      id: 'off-03',
      badge_number: 'GJ-POL-4412',
      full_name: 'Sub-Inspector M.P. Patel',
      role: 'OPERATOR',
      rank: 'Police Sub-Inspector (PSI)',
      station: 'Ellisbridge Police Station',
      district: 'Ahmedabad City',
      email: 'mp.patel@gujaratpolice.gov.in',
      is_active: true,
      last_login: '2026-09-01 10:45:00 IST',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">
              State Police Officer Management & RBAC Authority
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Official Police Badge Authentication &bull; Tiered Roles & Permissions &bull; Admin Operations
            </p>
          </div>
        </div>

        <button className="px-3.5 py-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md">
          <UserPlus className="w-4 h-4" />
          <span>ONBOARD OFFICER</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded border border-slate-800 bg-sentinel-900 overflow-hidden font-mono text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Officer / Badge</th>
              <th className="p-3">Rank & Department</th>
              <th className="p-3">Jurisdiction Station</th>
              <th className="p-3">RBAC Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {officers.map((off) => (
              <tr key={off.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-slate-100">{off.full_name}</div>
                  <div className="text-[10px] text-cyber-cyan font-bold">{off.badge_number}</div>
                </td>
                <td className="p-3 text-slate-300">{off.rank}</td>
                <td className="p-3 text-slate-300">
                  {off.station}, {off.district}
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold text-[10px]">
                    {off.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    ACTIVE
                  </span>
                </td>
                <td className="p-3 text-right text-slate-400 text-[11px]">{off.last_login}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
