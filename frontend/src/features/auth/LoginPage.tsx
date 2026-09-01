import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, ShieldCheck, UserPlus, KeyRound, Building, Mail, Phone, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { authApi } from '../../core/api/authApi';
import { UserRole } from '../../core/types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [badgeNumber, setBadgeNumber] = useState('GJ-POL-8842');
  const [password, setPassword] = useState('password123');
  const [totpToken, setTotpToken] = useState('482910');
  const [selectedRole, setSelectedRole] = useState<UserRole>('INVESTIGATOR');

  // Registration form state
  const [regBadge, setRegBadge] = useState(`GJ-POL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [regName, setRegName] = useState('');
  const [regRank, setRegRank] = useState('Police Inspector (PI)');
  const [regRole, setRegRole] = useState('INVESTIGATOR');
  const [regStation, setRegStation] = useState('Navrangpura Police Station, Ahmedabad');
  const [regDistrict, setRegDistrict] = useState('Ahmedabad City');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('police123');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authApi.login(badgeNumber.trim(), password.trim());
      res.officer.role = selectedRole;
      login(res.officer, res.tokens);
      navigate('/live');
    } catch (err: any) {
      setErrorMessage('Invalid police credentials or badge number.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regBadge.trim()) {
      setErrorMessage('Please fill in all mandatory officer fields.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authApi.register({
        badge_number: regBadge.trim().toUpperCase(),
        full_name: regName.trim(),
        rank: regRank,
        role: regRole,
        station: regStation,
        district: regDistrict,
        email: regEmail.trim() || `${regBadge.toLowerCase()}@gujaratpolice.gov.in`,
        password: regPassword,
      });
      login(res.officer, res.tokens);
      navigate('/live');
    } catch (err: any) {
      setErrorMessage('Failed to register officer credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sentinel-950 bg-tactical-grid flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-sentinel-900/95 backdrop-blur border border-slate-800 rounded-lg p-6 shadow-2xl space-y-5">
        {/* State Police Emblem Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sentinel-800 to-slate-900 border-2 border-cyber-cyan mx-auto flex items-center justify-center shadow-glow-cyan">
            <Shield className="w-8 h-8 text-cyber-cyan" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wider">
              GUJARAT POLICE SENTINEL
            </h1>
            <p className="text-xs text-cyber-cyan font-bold">
              AI Command & Investigation SOC Platform &bull; 2026
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-cyber-cyan text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>OFFICER LOGIN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-cyber-cyan text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ONBOARD / SIGN UP</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-950/80 border border-red-700 text-red-300 rounded text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: LOGIN FORM */}
        {/* ================================================================= */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Duty Password / Secret</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Hardware MFA / TOTP Token (6-digit)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="482910"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-cyber-cyan font-extrabold tracking-widest focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Assigned Operational Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
              >
                <option value="INVESTIGATOR">INVESTIGATOR (Forensics & 65B Dossier)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority)</option>
                <option value="PATROL_OFFICER">PATROL_OFFICER (Live Feed & Hotlist Alert)</option>
                <option value="DISPATCHER">DISPATCHER (Emergency Chowki Intercept)</option>
                <option value="ADMIN">ADMIN (System & User Management)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-glow-cyan mt-2"
            >
              <span>{loading ? 'AUTHENTICATING BADGE...' : 'AUTHENTICATE & ENTER SOC'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* TAB 2: REGISTRATION FORM */}
        {/* ================================================================= */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 text-[10px]">Police Badge *</label>
                <input
                  type="text"
                  required
                  value={regBadge}
                  onChange={(e) => setRegBadge(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-cyber-cyan font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 text-[10px]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Inspector A.B. Shah"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 text-[10px]">Rank</label>
                <select
                  value={regRank}
                  onChange={(e) => setRegRank(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-[11px]"
                >
                  <option value="Police Inspector (PI)">Police Inspector (PI)</option>
                  <option value="Police Sub-Inspector (PSI)">Police Sub-Inspector (PSI)</option>
                  <option value="Superintendent of Police (SP)">Superintendent of Police (SP)</option>
                  <option value="Director General of Police (DGP)">Director General of Police (DGP)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1 text-[10px]">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-[11px]"
                >
                  <option value="INVESTIGATOR">INVESTIGATOR</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="PATROL_OFFICER">PATROL_OFFICER</option>
                  <option value="DISPATCHER">DISPATCHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Station & District</label>
              <input
                type="text"
                value={regStation}
                onChange={(e) => setRegStation(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Set Password *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              <span>{loading ? 'ONBOARDING...' : 'REGISTER & ENTER PLATFORM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Section 65B Law Enforcement Certified Audit Trail Enabled</span>
        </div>
      </div>
    </div>
  );
};
