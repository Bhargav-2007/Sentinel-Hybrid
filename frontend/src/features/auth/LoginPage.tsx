import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, ShieldCheck, UserPlus, KeyRound, Building, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { authApi } from '../../core/api/authApi';
import { UserRole } from '../../core/types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Official default demo credentials
  const [badgeNumber, setBadgeNumber] = useState('POLICE-AHM-042');
  const [password, setPassword] = useState('Sentinel@2026');
  const [totpToken, setTotpToken] = useState('482910');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SOC_LEAD');

  // Registration form state
  const [regBadge, setRegBadge] = useState('');
  const [regName, setRegName] = useState('');
  const [regRank, setRegRank] = useState('Police Inspector (PI)');
  const [regRole, setRegRole] = useState('INVESTIGATOR');
  const [regStation, setRegStation] = useState('Navrangpura Police Station, Ahmedabad');
  const [regDistrict, setRegDistrict] = useState('Ahmedabad City');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('Sentinel@2026');

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
      setErrorMessage('Authentication rejected. Verify Officer Badge ID and duty credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoSupervisor = () => {
    setBadgeNumber('POLICE-AHM-042');
    setPassword('Sentinel@2026');
    setSelectedRole('SOC_LEAD');
    setErrorMessage(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regBadge.trim()) {
      setErrorMessage('Please fill in all mandatory officer identification fields.');
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
      setErrorMessage('Failed to register officer credentials. Badge ID may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* State Insignia & Header */}
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#131d33] border-2 border-amber-600/50 mx-auto flex items-center justify-center shadow-md">
            <Shield className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-normal font-sans">
              ગુજરાત રાજ્ય પોલીસ &bull; GUJARAT POLICE
            </h1>
            <p className="text-xs text-blue-400 font-medium mt-0.5">
              CSITMS Central Surveillance & Investigation Platform
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              Restricted Law Enforcement Access Only
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-[#0b1120] p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>OFFICER SIGN IN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>NEW BADGE ONBOARD</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-md text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Demo Fill Helper */}
        {tab === 'login' && (
          <div className="p-2.5 rounded-md bg-blue-950/40 border border-blue-800/40 flex items-center justify-between">
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-white">Default Duty Clearance:</span>{' '}
              <span className="font-mono text-blue-300">POLICE-AHM-042</span>
            </div>
            <button
              type="button"
              onClick={fillDemoSupervisor}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              Fill Credentials
            </button>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Officer Badge ID / Serial</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. POLICE-AHM-042"
                  className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Duty Password / Credentials</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">MFA / TOTP Security Token</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value)}
                    placeholder="482910"
                    className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-slate-700 rounded-md text-amber-400 font-mono font-bold tracking-wider focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Operational Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-2 bg-[#070b14] border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="SOC_LEAD">SOC LEAD (State Command Supervisor)</option>
                  <option value="INVESTIGATOR">CRIME BRANCH INVESTIGATOR</option>
                  <option value="ADMIN">STATE SYSTEM ADMINISTRATOR</option>
                  <option value="OPERATOR">CONTROL ROOM OPERATOR</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{loading ? 'AUTHENTICATING BADGE...' : 'AUTHORIZE ACCESS & OPEN CONSOLE'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRATION FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">Badge Number *</label>
                <input
                  type="text"
                  required
                  value={regBadge}
                  onChange={(e) => setRegBadge(e.target.value)}
                  placeholder="GJ-POL-XXXX"
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Insp. Rajesh Varma"
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">Rank</label>
                <input
                  type="text"
                  value={regRank}
                  onChange={(e) => setRegRank(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">District</label>
                <input
                  type="text"
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1 text-[11px]">Police Station / Wing</label>
              <input
                type="text"
                value={regStation}
                onChange={(e) => setRegStation(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">Official Email</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="officer@gujaratpolice.gov.in"
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1 text-[11px]">Password *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070b14] border border-slate-700 rounded-md text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'ONBOARDING...' : 'REGISTER OFFICER CREDENTIALS'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Statutory Legal Notice Footer */}
        <div className="border-t border-slate-800 pt-3 text-center">
          <p className="text-[10px] text-slate-500 leading-tight">
            Protected under the Information Technology Act, 2000 &bull; All activity, searches, and exports are Section 65B audit-logged with cryptographic HMAC-SHA256 seals.
          </p>
        </div>
      </div>
    </div>
  );
};
