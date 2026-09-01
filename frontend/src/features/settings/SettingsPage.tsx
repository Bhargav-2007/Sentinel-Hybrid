import React from 'react';
import { Settings, Volume2, ShieldCheck, Database, HardDrive, Key } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export const SettingsPage: React.FC = () => {
  const { audioAlertsEnabled, toggleAudioAlerts, streamProtocol, setStreamProtocol } = useUIStore();

  return (
    <div className="space-y-4 max-w-4xl font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center gap-3">
        <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">SOC Tactical Console & Preferences</h1>
          <p className="text-xs text-slate-400">Audio Alarms &bull; Video Protocol &bull; Government API Gateway Integrations</p>
        </div>
      </div>

      <div className="grid gap-4 text-xs">
        {/* Audio Siren Settings */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Volume2 className="w-4 h-4 text-cyber-cyan" />
              <span>Real-Time APB Siren & Audio Synthesis</span>
            </div>
            <input
              type="checkbox"
              checked={audioAlertsEnabled}
              onChange={toggleAudioAlerts}
              className="accent-cyber-cyan w-4 h-4 cursor-pointer"
            />
          </div>
          <p className="text-slate-400 text-[11px]">
            Synthesizes tactical warning frequencies when a hotlist suspect plate or stolen vehicle is sighted on live grid feeds.
          </p>
        </div>

        {/* Video Protocol Switcher */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <HardDrive className="w-4 h-4 text-cyber-cyan" />
            <span>Video Ingestion Transport Layer</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'hls', label: 'HLS (HTTPS / CDN)', desc: 'Works on all networks behind proxy' },
              { id: 'webrtc', label: 'WebRTC / WHEP', desc: 'Sub-300ms ultra low-latency' },
              { id: 'rtsp', label: 'RTSP over TCP', desc: 'Direct 103.250.160.189:8554' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setStreamProtocol(p.id as any)}
                className={`p-3 rounded border text-left transition-all ${
                  streamProtocol === p.id
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-100">{p.label}</div>
                <div className="text-[10px] text-slate-500 mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 65B Key Management */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <Key className="w-4 h-4 text-cyber-cyan" />
            <span>Section 65B HMAC Secret Key & Digital Seal</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Master HSM Cryptographic Key used to calculate SHA-256 signatures for judicial evidence packaging under Bharatiya Sakshya Adhiniyam 2023.
          </p>
          <div className="p-2.5 rounded bg-black/60 border border-slate-800 text-[11px] text-emerald-400">
            GUJARAT_POLICE_SEC65B_HSM_SEAL_ACTIVE_KEY_2026_PROD
          </div>
        </div>
      </div>
    </div>
  );
};
