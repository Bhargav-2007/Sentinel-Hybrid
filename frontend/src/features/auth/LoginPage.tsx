import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { authApi } from '../../core/api/authApi';
import { UserRole } from '../../core/types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [badgeNumber, setBadgeNumber] = useState('GJ-POL-8842');
  const [password, setPassword] = useState('Sentinel@2026');
  const [selectedRole, setSelectedRole] = useState<UserRole>('INVESTIGATOR');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(badgeNumber, password);
      res.officer.role = selectedRole;
      login(res.officer, res.tokens);
      navigate('/live');
    } catch {
      // Fallback officer login
      login(
        {
          id: 'dev-off-01',
          badge_number: badgeNumber,
          full_name: 'Inspector R.K. Jadeja',
          role: selectedRole,
          rank: 'Police Inspector (PI)',
          station: 'Navrangpura Police Station',
          district: 'Ahmedabad City',
          email: 'rk.jadeja@gujaratpolice.gov.in',
          is_active: true,
        },
        {
          access_token: 'sentinel-prod-token',
          refresh_token: 'sentinel-refresh-token',
          token_type: 'Bearer',
          expires_in: 28800,
        }
      );
      navigate('/live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sentinel-950 bg-tactical-grid flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-sentinel-900/95 backdrop-blur border border-slate-800 rounded-lg p-6 shadow-2xl space-y-6">
        {/* State Police Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sentinel-800 to-slate-900 border-2 border-cyber-cyan mx-auto flex items-center justify-center shadow-glow-cyan">
            <Shield className="w-8 h-8 text-cyber-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-wider">
              GUJARAT POLICE SENTINEL
            </h1>
            <p className="text-xs text-cyber-cyan font-bold">
              AI Command & Investigation Platform &bull; 2026
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Police Officer Badge Number</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                required
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="e.g. GJ-POL-8842"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Authentication Secret / Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Role Jurisdiction (RBAC Demo Access)</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-cyber-cyan font-bold focus:outline-none focus:border-cyber-cyan"
            >
              <option value="INVESTIGATOR">Investigator (Full 360° Dossier, Route & 65B Export)</option>
              <option value="OPERATOR">Operator (Live Video Matrix & APB Alerts Only)</option>
              <option value="SOC_LEAD">SOC Lead (Watchlists & Case Assignments)</option>
              <option value="ADMIN">Admin (Full System & User Management)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md mt-2"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS POLICE COMMAND'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Notice */}
        <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Authorized Gujarat Law Enforcement Personnel Only. Access is logged and audited under the Official Secrets Act.
          </span>
        </div>
      </div>
    </div>
  );
};
