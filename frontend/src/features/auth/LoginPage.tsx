import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { Shield, KeyRound, AlertTriangle, Flame, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setBreakGlass } = useAuthStore();

  const [officerId, setOfficerId] = useState('POLICE-AHM-042');
  const [password, setPassword] = useState('Sentinel@2026');
  const [isBreakGlassMode, setIsBreakGlassMode] = useState(false);
  const [firNumber, setFirNumber] = useState('FIR-2026-CR-0881');
  const [incidentReason, setIncidentReason] = useState('Emergency Hotlist Pursuit - Suspect vehicle in transit.');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        const tokens = await authService.login(officerId, password);
        setAuth(tokens);
      }
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify Badge Number.');
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    { id: 'POLICE-AHM-042', role: 'Duty Officer (Ahmedabad)', pass: 'Sentinel@2026' },
    { id: 'ADMIN-GND-001', role: 'State DGP / Administrator', pass: 'Sentinel@2026' },
    { id: 'DISPATCH-SRT-019', role: 'PCR Dispatcher (Surat)', pass: 'Sentinel@2026' },
  ];

  return (
    <div className="min-h-screen bg-[#040711] flex items-center justify-center p-4 relative overflow-hidden font-mono select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#091024_1px,transparent_1px),linear-gradient(to_bottom,#091024_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

      {/* Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#080d1a]/90 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl shadow-cyan-950/30 flex flex-col gap-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-700 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-1">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-wider">GUJARAT POLICE SENTINEL</h1>
          <p className="text-xs text-cyan-400 font-semibold tracking-widest uppercase">
            Surveillance Intelligence & SOC Console
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-300 rounded-lg flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Officer ID / Badge Number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold text-[11px] flex items-center justify-between">
              <span>OFFICER BADGE / PERSONNEL ID</span>
              <span className="text-slate-400 text-[10px]">REQUIRED</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value.toUpperCase())}
                placeholder="e.g. POLICE-AHM-042"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold text-[11px]">SECURITY CREDENTIAL</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Break-Glass Toggle */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBreakGlassMode(!isBreakGlassMode)}>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px]">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>EMERGENCY BREAK-GLASS ACCESS</span>
              </div>
              <input
                type="checkbox"
                checked={isBreakGlassMode}
                onChange={(e) => setIsBreakGlassMode(e.target.checked)}
                className="w-4 h-4 rounded text-red-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {isBreakGlassMode && (
              <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/80 animate-fadeIn">
                <div>
                  <label className="text-[10px] text-slate-400">MANDATORY FIR / GD NUMBER</label>
                  <input
                    type="text"
                    required
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    placeholder="FIR-2026-CR-0881"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-amber-500/40 text-amber-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">INCIDENT JUSTIFICATION REASON</label>
                  <textarea
                    rows={2}
                    required
                    value={incidentReason}
                    onChange={(e) => setIncidentReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-amber-500/40 text-amber-200 text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-xs tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
              isBreakGlassMode
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-red-500/30 hover:opacity-95'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25'
            }`}
          >
            {loading ? (
              <span>AUTHENTICATING BADGE...</span>
            ) : isBreakGlassMode ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>AUTHORIZE EMERGENCY BREAK-GLASS</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ENTER POLICE COMMAND ROOM</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Role Fill Presets */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Demo Personnel Credentials</span>
          <div className="grid grid-cols-1 gap-1">
            {quickRoles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setOfficerId(r.id);
                  setPassword(r.pass);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 text-[11px] text-left text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <span className="font-bold text-slate-200">{r.id}</span>
                <span className="text-slate-400 text-[10px]">{r.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
