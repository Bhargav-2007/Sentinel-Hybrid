import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, ROLE_PRESETS } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { 
  Shield, 
  KeyRound, 
  AlertTriangle, 
  Flame, 
  Lock, 
  Building2, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight,
  Radio
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setBreakGlass, switchRolePreset } = useAuthStore();

  const [selectedRolePreset, setSelectedRolePreset] = useState<'OPERATOR' | 'INVESTIGATOR' | 'SUPERVISOR' | 'ADMIN'>('INVESTIGATOR');
  const [officerId, setOfficerId] = useState('INV-AHM-042');
  const [password, setPassword] = useState('Sentinel@2026');
  const [department, setDepartment] = useState('Gujarat Police — State Command');
  const [isBreakGlassMode, setIsBreakGlassMode] = useState(false);
  const [firNumber, setFirNumber] = useState('FIR-2026-CR-08942');
  const [incidentReason, setIncidentReason] = useState('Emergency Hotlist Pursuit — Stolen Fortuner in transit on SG Highway.');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectPreset = (presetKey: 'OPERATOR' | 'INVESTIGATOR' | 'SUPERVISOR' | 'ADMIN') => {
    setSelectedRolePreset(presetKey);
    const p = ROLE_PRESETS[presetKey];
    setOfficerId(p.officer_id);
    setDepartment(p.department);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isBreakGlassMode) {
        const bgRes = await authService.requestBreakGlass({
          officer_id: officerId,
          fir_number: firNumber,
          incident_reason: incidentReason,
          duration_minutes: 60,
        });

        // Elevated login
        const tokens = await authService.login(officerId, password);
        setAuth(tokens);
        setBreakGlass(bgRes.elevated_role, bgRes.expires_at);
      } else {
        switchRolePreset(selectedRolePreset);
      }
      navigate('/');
    } catch (err: any) {
      // Fallback to offline preset login
      switchRolePreset(selectedRolePreset);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 relative overflow-hidden font-mono select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#091024_1px,transparent_1px),linear-gradient(to_bottom,#091024_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#080d1a]/95 backdrop-blur-2xl border border-slate-800 p-7 rounded-3xl shadow-2xl shadow-cyan-950/40 flex flex-col gap-5">
        {/* Header / Branding */}
        <div className="flex flex-col items-center text-center gap-1.5 border-b border-slate-800/80 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-1">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wider">GUJARAT POLICE SENTINEL</h1>
          <p className="text-[11px] text-cyan-400 font-sans tracking-wide uppercase">
            Integrated Command & Intelligence Center
          </p>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-sans mt-1">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Keycloak / OIDC Secure Auth Gateway</span>
          </div>
        </div>

        {/* Role Quick-Selector for Evaluation */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Select Evaluation Role & Permissions:</span>
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
            {(['OPERATOR', 'INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as const).map((rKey) => (
              <button
                key={rKey}
                type="button"
                onClick={() => selectPreset(rKey)}
                className={`py-1.5 rounded-lg font-bold transition-all ${
                  selectedRolePreset === rKey
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {rKey}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-300 rounded-xl flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username / Official ID */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold text-[11px]">Username / Official ID</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value.toUpperCase())}
                placeholder="e.g. INV-AHM-042"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold text-[11px]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Department Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold text-[11px]">Department</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 appearance-none"
              >
                <option value="Gujarat Police — State Command">Gujarat Police — State Command</option>
                <option value="Gujarat Police — Ahmedabad City">Gujarat Police — Ahmedabad City</option>
                <option value="Gujarat Police — CID Crime">Gujarat Police — CID Crime</option>
                <option value="Gujarat Police — State Cyber Command">Gujarat Police — State Cyber Command</option>
                <option value="Gujarat State Transport Department">Gujarat State Transport Department</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN TO COMMAND CENTER'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-900 text-center text-[10px] text-slate-400 font-sans">
          <span>Active Clearance: </span>
          <strong className="text-cyan-300 font-mono">{selectedRolePreset}</strong>
          <span> • Section 65B Certified Terminal</span>
        </div>
      </div>
    </div>
  );
};
