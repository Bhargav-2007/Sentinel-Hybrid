import React, { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  ShieldCheck,
  Database,
  HardDrive,
  Key,
  Cpu,
  Radio,
  Sliders,
  PhoneCall,
  Lock,
  Globe,
  RefreshCw,
  CheckCircle,
  Save,
  BellRing,
  Server,
  Activity,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { playRiskAlertSiren } from '../../shared/utils/alertSiren';

const SETTINGS_STORAGE_KEY = 'sentinel_soc_enterprise_settings';

export const SettingsPage: React.FC = () => {
  const { audioAlertsEnabled, toggleAudioAlerts, streamProtocol, setStreamProtocol } = useUIStore();
  const [activeTab, setActiveTab] = useState<'ai' | 'stream' | 'dispatch' | 'forensics' | 'gateways' | 'security'>('ai');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // AI Inference Engine Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.40);
  const [inferenceBackend, setInferenceBackend] = useState('NVIDIA TensorRT GPU (CUDA 12.4)');
  const [detectCars, setDetectCars] = useState(true);
  const [detectPlates, setDetectPlates] = useState(true);
  const [detectAutos, setDetectAutos] = useState(true);
  const [detectBikes, setDetectBikes] = useState(true);
  const [detectPeds, setDetectPeds] = useState(true);
  const [targetFps, setTargetFps] = useState('25');

  // Emergency Auto-Dispatch Settings
  const [autoCallEnabled, setAutoCallEnabled] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(80);
  const [dispatchPolicy, setDispatchPolicy] = useState('NEAREST_GIS_CHOWKI');
  const [sirenVolume, setSirenVolume] = useState(80);

  // Cryptography & Forensics
  const [hmacSecretKey, setHmacSecretKey] = useState('GUJARAT_POLICE_SEC65B_HSM_SEAL_KEY_2026_PROD');
  const [hashAlgorithm, setHashAlgorithm] = useState('SHA-256 (FIPS 180-4)');
  const [timeSource, setTimeSource] = useState('NTP Stratum 1 Gujarat State Clock');

  // External Govt Gateways
  const [vahanEndpoint, setVahanEndpoint] = useState('https://vahan.parivahan.gov.in/api/v4/scr/gujarat');
  const [egujcopSyncInterval, setEgujcopSyncInterval] = useState('Live Real-Time Push');
  const [fastagEndpoint, setFastagEndpoint] = useState('https://npci.org.in/api/fastag/toll/gujarat');

  // Security Policy
  const [sessionTimeout, setSessionTimeout] = useState('8 Hours (SOC Shift)');
  const [enforceMfa, setEnforceMfa] = useState(true);
  const [ipWhitelisting, setIpWhitelisting] = useState(true);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.confidenceThreshold !== undefined) setConfidenceThreshold(parsed.confidenceThreshold);
        if (parsed.inferenceBackend) setInferenceBackend(parsed.inferenceBackend);
        if (parsed.detectCars !== undefined) setDetectCars(parsed.detectCars);
        if (parsed.detectPlates !== undefined) setDetectPlates(parsed.detectPlates);
        if (parsed.detectAutos !== undefined) setDetectAutos(parsed.detectAutos);
        if (parsed.detectBikes !== undefined) setDetectBikes(parsed.detectBikes);
        if (parsed.detectPeds !== undefined) setDetectPeds(parsed.detectPeds);
        if (parsed.targetFps) setTargetFps(parsed.targetFps);
        if (parsed.autoCallEnabled !== undefined) setAutoCallEnabled(parsed.autoCallEnabled);
        if (parsed.riskThreshold !== undefined) setRiskThreshold(parsed.riskThreshold);
        if (parsed.dispatchPolicy) setDispatchPolicy(parsed.dispatchPolicy);
        if (parsed.sirenVolume !== undefined) setSirenVolume(parsed.sirenVolume);
        if (parsed.hmacSecretKey) setHmacSecretKey(parsed.hmacSecretKey);
        if (parsed.hashAlgorithm) setHashAlgorithm(parsed.hashAlgorithm);
        if (parsed.timeSource) setTimeSource(parsed.timeSource);
        if (parsed.vahanEndpoint) setVahanEndpoint(parsed.vahanEndpoint);
        if (parsed.egujcopSyncInterval) setEgujcopSyncInterval(parsed.egujcopSyncInterval);
        if (parsed.fastagEndpoint) setFastagEndpoint(parsed.fastagEndpoint);
        if (parsed.sessionTimeout) setSessionTimeout(parsed.sessionTimeout);
        if (parsed.enforceMfa !== undefined) setEnforceMfa(parsed.enforceMfa);
        if (parsed.ipWhitelisting !== undefined) setIpWhitelisting(parsed.ipWhitelisting);
      }
    } catch {
      // Keep defaults
    }
  }, []);

  const handleSaveSettings = () => {
    const config = {
      confidenceThreshold,
      inferenceBackend,
      detectCars,
      detectPlates,
      detectAutos,
      detectBikes,
      detectPeds,
      targetFps,
      autoCallEnabled,
      riskThreshold,
      dispatchPolicy,
      sirenVolume,
      hmacSecretKey,
      hashAlgorithm,
      timeSource,
      vahanEndpoint,
      egujcopSyncInterval,
      fastagEndpoint,
      sessionTimeout,
      enforceMfa,
      ipWhitelisting,
      streamProtocol,
      audioAlertsEnabled,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
    setSavedToast('✓ SOC Platform Configuration & Security Policies Saved Successfully to System Storage');
    setTimeout(() => setSavedToast(null), 4000);
  };

  const handleResetDefaults = () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setConfidenceThreshold(0.40);
    setInferenceBackend('NVIDIA TensorRT GPU (CUDA 12.4)');
    setDetectCars(true);
    setDetectPlates(true);
    setDetectAutos(true);
    setDetectBikes(true);
    setDetectPeds(true);
    setTargetFps('25');
    setAutoCallEnabled(true);
    setRiskThreshold(80);
    setDispatchPolicy('NEAREST_GIS_CHOWKI');
    setSirenVolume(80);
    setHmacSecretKey('GUJARAT_POLICE_SEC65B_HSM_SEAL_KEY_2026_PROD');
    setHashAlgorithm('SHA-256 (FIPS 180-4)');
    setTimeSource('NTP Stratum 1 Gujarat State Clock');
    setVahanEndpoint('https://vahan.parivahan.gov.in/api/v4/scr/gujarat');
    setEgujcopSyncInterval('Live Real-Time Push');
    setFastagEndpoint('https://npci.org.in/api/fastag/toll/gujarat');
    setSessionTimeout('8 Hours (SOC Shift)');
    setEnforceMfa(true);
    setIpWhitelisting(true);
    setStreamProtocol('hls');
    setSavedToast('✓ Reset Configuration to Factory Default Parameters');
    setTimeout(() => setSavedToast(null), 4000);
  };

  const handleTestSiren = () => {
    playRiskAlertSiren(95);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              Gujarat Sentinel SOC Enterprise Settings & System Configuration
            </h1>
            <p className="text-xs text-slate-400">
              AI Inference Parameters &bull; Emergency Dispatch Routing &bull; HSM Cryptography &bull; External Gateways
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset to default settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {[
          { id: 'ai', label: '🧠 AI & VISION', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'stream', label: '📡 STREAM GRID', icon: <Radio className="w-3.5 h-3.5" /> },
          { id: 'dispatch', label: '🚨 DISPATCH & CALL', icon: <PhoneCall className="w-3.5 h-3.5" /> },
          { id: 'forensics', label: '🔐 65B HSM SEAL', icon: <Key className="w-3.5 h-3.5" /> },
          { id: 'gateways', label: '🏛️ GOVT GATEWAYS', icon: <Globe className="w-3.5 h-3.5" /> },
          { id: 'security', label: '🛡️ SECURITY & RBAC', icon: <Lock className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`p-2.5 rounded border text-left font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-md'
                : 'bg-sentinel-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Settings Content Area */}
      <div className="p-6 rounded bg-sentinel-900 border border-slate-800 text-xs space-y-6">
        {/* TAB 1: AI INFERENCE ENGINE & YOLO VISION */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-cyber-cyan" />
                <span>YOLO Computer Vision & Object Detection Engine</span>
              </h3>
              <p className="text-slate-400 text-xs">
                Configure neural network inference hyperparameters, confidence thresholds, and hardware accelerator backends.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Confidence Threshold (IoU / Conf)</span>
                  <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan font-bold">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyber-cyan cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Detections below this confidence score will be suppressed from the surveillance stream.
                </p>
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block">AI Hardware Accelerator Backend</span>
                <select
                  value={inferenceBackend}
                  onChange={(e) => setInferenceBackend(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-200"
                >
                  <option value="NVIDIA TensorRT GPU (CUDA 12.4)">NVIDIA TensorRT GPU (CUDA 12.4)</option>
                  <option value="NVIDIA DeepStream NPU (Edge Accelerated)">NVIDIA DeepStream NPU (Edge Accelerated)</option>
                  <option value="Intel OpenVINO Neural Compute">Intel OpenVINO Neural Compute</option>
                  <option value="Multi-Core AVX-512 CPU Fallback">Multi-Core AVX-512 CPU Fallback</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Primary execution device: NVIDIA GeForce RTX GPU (8151 MiB VRAM).
                </p>
              </div>
            </div>

            <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 block">Active Target Classification Classes</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Cars & SUVs', state: detectCars, set: setDetectCars },
                  { label: 'HSRP Plates', state: detectPlates, set: setDetectPlates },
                  { label: 'Auto-Rickshaws', state: detectAutos, set: setDetectAutos },
                  { label: 'Bikes & Scooters', state: detectBikes, set: setDetectBikes },
                  { label: 'Pedestrians', state: detectPeds, set: setDetectPeds },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 cursor-pointer p-2 rounded bg-sentinel-900 border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                      className="accent-cyber-cyan w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-300 font-bold text-[11px]">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SURVEILLANCE GRID & VIDEO PROTOCOLS */}
        {activeTab === 'stream' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-cyber-cyan" />
                <span>Video Ingestion & Transport Layer Configuration</span>
              </h3>
              <p className="text-slate-400 text-xs">
                Select the default video streaming transport for the 30-camera Gujarat CCTV grid.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'hls', label: 'HLS (HTTPS / CDN)', desc: 'Enterprise standard. Runs on all secure networks behind govt proxy.', port: '443 / 80' },
                { id: 'webrtc', label: 'WebRTC / WHEP', desc: 'Sub-300ms ultra low-latency WebRTC stream protocol.', port: '8889' },
                { id: 'rtsp', label: 'RTSP over TCP', desc: 'Direct raw RTSP ingest from 103.250.160.189:8554.', port: '8554' },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setStreamProtocol(p.id as any)}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    streamProtocol === p.id
                      ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">{p.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      Port {p.port}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Target Ingestion Framerate (FPS)</span>
                <select
                  value={targetFps}
                  onChange={(e) => setTargetFps(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-200"
                >
                  <option value="15">15 FPS (Optimized Bandwidth)</option>
                  <option value="25">25 FPS (Broadcast Standard)</option>
                  <option value="30">30 FPS (High-Precision Pursuit)</option>
                </select>
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Live Media Gateway Hub</span>
                <input
                  type="text"
                  readOnly
                  value="103.250.160.189 / cctv.corp8.cloud"
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-cyber-cyan font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EMERGENCY AUTO-CALL & INTERCEPT DISPATCH */}
        {activeTab === 'dispatch' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <PhoneCall className="w-4 h-4 text-cyber-crimson" />
                <span>Automated Emergency Intercept & Police Chowki Dispatch</span>
              </h3>
              <p className="text-slate-400 text-xs">
                When high-threat vehicles are detected, automatically place an emergency audio call & dispatch the dossier to the nearest police station or chowki.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Auto-Call & Dispatch System</span>
                  <input
                    type="checkbox"
                    checked={autoCallEnabled}
                    onChange={(e) => setAutoCallEnabled(e.target.checked)}
                    className="accent-cyber-crimson w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Automatically initiates emergency voice synthesis relay and transmits 360° vehicle profiles upon critical sighting.
                </p>
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Minimum Risk Score Trigger</span>
                  <span className="px-2 py-0.5 rounded bg-red-950 border border-cyber-crimson text-cyber-crimson font-bold">
                    Risk ≥ {riskThreshold}/100
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-cyber-crimson cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Acoustic APB Siren & Audio Alarm</span>
                <button
                  onClick={handleTestSiren}
                  className="px-2.5 py-1 rounded bg-red-900/80 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>TEST APB SIREN</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Plays real dual-tone European/Police intercept frequencies through duty console audio monitors.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: SECTION 65B FORENSICS & HSM CRYPTOGRAPHY */}
        {activeTab === 'forensics' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-cyber-cyan" />
                <span>Section 65B Forensics & Hardware Cryptography Seal</span>
              </h3>
              <p className="text-slate-400 text-xs">
                Master cryptographic keys and algorithms used for Section 65B / Bharatiya Sakshya Adhiniyam 2023 evidence certification.
              </p>
            </div>

            <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
              <span className="font-bold text-slate-200 block">HSM Master Secret Key Phrase</span>
              <input
                type="text"
                value={hmacSecretKey}
                onChange={(e) => setHmacSecretKey(e.target.value)}
                className="w-full px-3 py-2 bg-sentinel-900 border border-slate-700 rounded text-cyber-cyan font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Key used by the Hardware Security Module (HSM) to sign Section 65B forensic certificates with HMAC-SHA256.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Digest Hash Algorithm</span>
                <input
                  type="text"
                  readOnly
                  value={hashAlgorithm}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-300 font-bold"
                />
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Authoritative Time Source</span>
                <input
                  type="text"
                  readOnly
                  value={timeSource}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-300 font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXTERNAL GOVT GATEWAYS */}
        {activeTab === 'gateways' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-cyber-cyan" />
                <span>External Government Gateways & National Registries</span>
              </h3>
              <p className="text-slate-400 text-xs">
                Integrations with Ministry of Road Transport (VAHAN 4.0), Gujarat Police eGujCop/CCTNS, and NETC FASTag toll networks.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">VAHAN 4.0 National Vehicle Registry Gateway</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-700">
                    CONNECTED
                  </span>
                </div>
                <input
                  type="text"
                  value={vahanEndpoint}
                  onChange={(e) => setVahanEndpoint(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-300"
                />
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">eGujCop / CCTNS Crime Database Live Feed</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-700">
                    ONLINE
                  </span>
                </div>
                <input
                  type="text"
                  value={egujcopSyncInterval}
                  onChange={(e) => setEgujcopSyncInterval(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-300"
                />
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">NETC FASTag Gujarat Toll Barrier Feed</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-700">
                    ONLINE
                  </span>
                </div>
                <input
                  type="text"
                  value={fastagEndpoint}
                  onChange={(e) => setFastagEndpoint(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-sentinel-900 border border-slate-700 rounded text-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY & RBAC */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-cyber-cyan" />
                <span>SOC Security Policy & Role-Based Access Controls</span>
              </h3>
              <p className="text-slate-400 text-xs">
                Enforce multi-factor authentication, station IP whitelisting, and duty session timeouts for Gujarat Police officers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Enforce Multi-Factor Auth (MFA)</span>
                  <input
                    type="checkbox"
                    checked={enforceMfa}
                    onChange={(e) => setEnforceMfa(e.target.checked)}
                    className="accent-cyber-cyan w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Requires Time-based One-Time Password (TOTP) / Security Key for officer login.
                </p>
              </div>

              <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Police Intranet IP Whitelisting</span>
                  <input
                    type="checkbox"
                    checked={ipWhitelisting}
                    onChange={(e) => setIpWhitelisting(e.target.checked)}
                    className="accent-cyber-cyan w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Restricts access strictly to authorized Gujarat Police WAN & LAN subnets.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
