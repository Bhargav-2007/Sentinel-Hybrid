import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  Lock,
  X,
  Plus,
  BadgeAlert,
  Building,
  Mail,
  Phone,
} from 'lucide-react';
import { OfficerUser } from '../../core/types/auth';
import { apiClient } from '../../core/api/client';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [badgeNumber, setBadgeNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('Police Inspector (PI)');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'INVESTIGATOR' | 'PATROL_OFFICER' | 'DISPATCHER' | 'ADMIN' | 'OPERATOR'>('INVESTIGATOR');
  const [station, setStation] = useState('Navrangpura Police Station, Ahmedabad');
  const [district, setDistrict] = useState('Ahmedabad City');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 98765 00000');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient<any>('/api/v1/users');
      return Array.isArray(res) ? res : res.users || [];
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowOnboardModal(false);
      setToastMessage(`✓ Officer ${badgeNumber} onboarded successfully with ${role} permissions.`);
      setTimeout(() => setToastMessage(null), 4000);
      setFullName('');
      setBadgeNumber('');
    },
  });

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !badgeNumber.trim()) return;

    onboardMutation.mutate({
      badge_number: badgeNumber.trim().toUpperCase(),
      full_name: fullName.trim(),
      rank,
      role,
      station,
      district,
      email: email.trim() || `${badgeNumber.toLowerCase()}@gujaratpolice.gov.in`,
      phone,
    });
  };

  const officers: OfficerUser[] = usersData || [];

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              State Police Officer Management & RBAC Authority
            </h1>
            <p className="text-xs text-slate-400">
              Official Police Badge Authentication &bull; Tiered Roles & Permissions &bull; Active Duty Rosters
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          className="px-3.5 py-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>ONBOARD OFFICER</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded border border-slate-800 bg-sentinel-900 overflow-hidden text-xs">
        {isLoading ? (
          <div className="p-8 text-center text-cyber-cyan">Loading Officer Registry...</div>
        ) : (
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
                <tr key={off.id || off.badge_number} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-100">{off.full_name}</div>
                    <div className="text-[10px] text-cyber-cyan font-bold">{off.badge_number}</div>
                  </td>
                  <td className="p-3 text-slate-300">{off.rank}</td>
                  <td className="p-3 text-slate-300">
                    {off.station}
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
                  <td className="p-3 text-right text-slate-400 font-mono text-[11px]">
                    {off.last_login || 'Active Now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Onboard Officer Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-sentinel-950 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-sentinel-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-cyan font-bold text-sm">
                <UserPlus className="w-5 h-5" />
                <span>Onboard Duty Officer to Sentinel Platform</span>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Police Badge Number *</label>
                  <input
                    type="text"
                    required
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-cyber-cyan font-bold focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Officer Full Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Inspector V.K. Solanki"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Rank / Designation</label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  >
                    <option value="Director General of Police (DGP)">Director General of Police (DGP)</option>
                    <option value="Inspector General of Police (IGP)">Inspector General of Police (IGP)</option>
                    <option value="Superintendent of Police (SP)">Superintendent of Police (SP)</option>
                    <option value="Police Inspector (PI)">Police Inspector (PI)</option>
                    <option value="Police Sub-Inspector (PSI)">Police Sub-Inspector (PSI)</option>
                    <option value="Head Constable">Head Constable</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">RBAC System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Clearance)</option>
                    <option value="INVESTIGATOR">INVESTIGATOR (Dossier & 65B)</option>
                    <option value="PATROL_OFFICER">PATROL_OFFICER (Live Feed & Alert)</option>
                    <option value="DISPATCHER">DISPATCHER (Chowki Intercept)</option>
                    <option value="ADMIN">ADMIN (System & User Config)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Jurisdiction Station</label>
                  <input
                    type="text"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">District / Commissionerate</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Official Police Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@gujaratpolice.gov.in"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Duty Phone / CUG</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardMutation.isPending}
                  className="px-4 py-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{onboardMutation.isPending ? 'ONBOARDING...' : 'ONBOARD OFFICER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
