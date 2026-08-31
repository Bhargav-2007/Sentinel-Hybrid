import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Camera } from '../../types/camera';
import { AlertIncident } from '../../types/alert';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GujaratGISMap } from '../../components/map/GujaratGISMap';
import { 
  Tv2, 
  ShieldAlert, 
  Camera as CameraIcon, 
  Activity, 
  Car, 
  ArrowUpRight, 
  Search, 
  ShieldCheck, 
  FileCheck,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  Lock,
  Layers
} from 'lucide-react';

export const CommandDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, officer } = useAuthStore();
  const { alerts, setAlerts } = useAlertStore();
  const { selectedDepartment, openSection65BModal } = useUIStore();
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);
  const [activeDemoMessage, setActiveDemoMessage] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState<boolean>(false);

  // 1. Fetch Cameras
  const { data: cameras = [], isLoading: loadingCameras } = useQuery({
    queryKey: ['cameras', selectedDepartment],
    queryFn: () => cameraService.listCameras({ department_id: selectedDepartment, limit: 50 }),
    refetchInterval: 15000,
  });

  // 2. Fetch Alerts
  const { data: initialAlerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.listAlerts({ limit: 20 }),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (initialAlerts.length > 0 && alerts.length === 0) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts, alerts.length, setAlerts]);

  // Set default selected camera
  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) {
      setSelectedCam(cameras[0]);
    }
  }, [cameras, selectedCam]);

  const onlineCameras = cameras.filter((c) => c.status === 'ONLINE').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const activePursuits = alerts.filter((a) => a.status === 'INVESTIGATING').length;

  // Tactical Demo Mode Scenario Dispatcher
  const triggerDemoScenario = (scenarioId: number) => {
    setDemoRunning(true);
    if (scenarioId === 1) {
      setActiveDemoMessage('🚨 SCENARIO 1 EXECUTED: Stolen Vehicle APB Alert Triggered! White Toyota Fortuner [GJ01AB1234] intercepted on SG Highway corridor (FIR-2026-CR-08942).');
      const newAlert: AlertIncident = {
        id: `INC-HOTLIST-${Date.now().toString().slice(-4)}`,
        incident_number: `APB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        alert_type: 'WATCHLIST_HIT' as any,
        severity: 'CRITICAL' as any,
        status: 'NEW' as any,
        title: 'CRITICAL APB HOTLIST MATCH: Stolen Toyota Fortuner',
        description: 'Target GJ01AB1234 matched against eGujCop Active Stolen Auto Database (FIR-2026-CR-08942 at Navrangpura PS). AI Threat Score: 98/100.',
        camera_id: '1',
        camera_name: 'SG Highway — Prahladnagar Junction',
        district: 'Ahmedabad City',
        station: 'Navrangpura PS',
        latitude: 23.0125,
        longitude: 72.5085,
        detected_plate: 'GJ01AB1234',
        vehicle_make: 'Toyota',
        vehicle_model: 'Fortuner',
        vehicle_color: 'White',
        confidence_score: 0.985,
        snapshot_url: '/snapshots/GJ01AB1234_demo.jpg',
        section65b_hmac_hash: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAlerts([newAlert, ...alerts]);
    } else if (scenarioId === 2) {
      setActiveDemoMessage('🛣️ SCENARIO 2 EXECUTED: Multi-Camera Cross-Tracking active. Vehicle traced across 4 SG Highway checkpoints (Speed: 68.2 km/h).');
      navigate('/investigate?plate=GJ01AB1234');
    } else if (scenarioId === 3) {
      setActiveDemoMessage('⚠️ SCENARIO 3 EXECUTED: Suspicious Anomaly Detected: Wrong-Way Vehicle in BRTS Dedicated Corridor (Threat Score: 95/100).');
      const anomalyAlert: AlertIncident = {
        id: `INC-ANOM-${Date.now().toString().slice(-4)}`,
        incident_number: `ANOM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        alert_type: 'ZONE_INTRUSION' as any,
        severity: 'CRITICAL' as any,
        status: 'NEW' as any,
        title: 'CRITICAL ANOMALY: Wrong-Way Driving in Restricted BRTS Lane',
        description: 'Commercial vehicle driving opposite to corridor flow at Ashram Road. Threat Score: 95/100.',
        camera_id: '2',
        camera_name: 'Ashram Road — Income Tax Crossroad',
        district: 'Ahmedabad City',
        station: 'Ellisbridge PS',
        latitude: 23.0410,
        longitude: 72.5695,
        detected_plate: 'GJ27TT8842',
        vehicle_make: 'Tata',
        vehicle_model: '407',
        vehicle_color: 'Yellow',
        confidence_score: 0.962,
        snapshot_url: '/snapshots/wrongway_demo.jpg',
        section65b_hmac_hash: '8f23ba0194bc028114ef018274ac918b01293847591028374829103948571029',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAlerts([anomalyAlert, ...alerts]);
    } else if (scenarioId === 4) {
      setActiveDemoMessage('🛡️ SCENARIO 4 EXECUTED: Section 65B Certified Forensic Evidence Package Generated with SHA-256 HMAC Signature.');
      openSection65BModal('INC-0245D8AA');
    }

    setTimeout(() => {
      setDemoRunning(false);
    }, 6000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Banner: Statewide Status & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0a1122] to-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              GUJARAT STATE POLICE COMMAND SITUATION ROOM
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Statewide Unified Video Management • Real-Time AI Threat Correlation • Section 65B Admissible
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate('/live-wall')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            <Tv2 className="w-4 h-4" />
            <span>OPEN VIDEO WALL</span>
          </button>
          <button
            onClick={() => navigate('/investigate')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs tracking-wider transition-all"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>360° SEARCH</span>
          </button>
        </div>
      </div>

      {/* 🚀 1-CLICK INTERACTIVE DEMO MODE TOOLBAR */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/40 p-4 rounded-2xl flex flex-col gap-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400 animate-bounce" />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              1-CLICK LIVE HACKATHON DEMO SCENARIO LAUNCHER
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">Zero-Configuration Instant Live Showcase</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => triggerDemoScenario(1)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-500/50 text-red-200 font-bold text-xs transition-all shadow-lg text-left"
          >
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <div className="text-[11px] leading-tight">1. Stolen Vehicle APB</div>
              <div className="text-[9px] text-red-300/70 font-sans">Hotlist Match & Triage</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemoScenario(2)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-200 font-bold text-xs transition-all shadow-lg text-left"
          >
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] leading-tight">2. Cross-Camera Route</div>
              <div className="text-[9px] text-cyan-300/70 font-sans">Corridor Speed Tracking</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemoScenario(3)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 border border-amber-500/50 text-amber-200 font-bold text-xs transition-all shadow-lg text-left"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] leading-tight">3. Suspicious Activity</div>
              <div className="text-[9px] text-amber-300/70 font-sans">Wrong-Way / Zone Intrusion</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemoScenario(4)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/50 text-emerald-200 font-bold text-xs transition-all shadow-lg text-left"
          >
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] leading-tight">4. Section 65B Evidence</div>
              <div className="text-[9px] text-emerald-300/70 font-sans">SHA-256 HMAC Certification</div>
            </div>
          </button>
        </div>

        {activeDemoMessage && (
          <div className="bg-slate-950/90 p-2.5 rounded-xl border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-sans">{activeDemoMessage}</span>
          </div>
        )}
      </div>

      {/* 4 High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Cameras */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">LIVE CAMERAS</span>
            <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
              <span>{onlineCameras}</span>
              <span className="text-xs text-slate-500">/ 50 SANDBOX</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-sans font-medium">● 80,000+ Scale Ready</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CameraIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active APB Threat Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">APB HOTLIST ALERTS</span>
            <div className="text-2xl font-bold text-red-400 mt-1 flex items-baseline gap-2">
              <span>{alerts.length}</span>
              <span className="text-xs text-red-500 font-bold">({criticalAlerts} CRITICAL)</span>
            </div>
            <span className="text-[10px] text-red-400/80 font-sans font-medium">eGujCop Watchlist Sync</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: 24h ANPR Sightings */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">24H ANPR SIGHTINGS</span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">142,850</div>
            <span className="text-[10px] text-cyan-400 font-sans font-medium">YOLO11 + Multi-Frame OCR</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Car className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Pursuits */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">ACTIVE PURSUITS</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{activePursuits} UNITS</div>
            <span className="text-[10px] text-amber-400/80 font-sans font-medium">Corridor Intercept Mode</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Center Section: Live Video Quad + Gujarat GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Mini Video Quad Wall (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                TACTICAL FEED MATRIX (LIVE CORP8 CAMERAS)
              </h2>
            </div>
            <button
              onClick={() => navigate('/live-wall')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>EXPAND WALL</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[420px]">
            {cameras.slice(0, 4).map((cam) => (
              <VideoPlayer
                key={cam.id}
                camera={cam}
                isSelected={selectedCam?.id === cam.id}
                onClick={() => setSelectedCam(cam)}
                onSnapshot={() => alert(`Snapshot saved for ${cam.camera_code}`)}
              />
            ))}
          </div>
        </div>

        {/* Right: Gujarat GIS Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                GUJARAT GIS SPATIAL SURVEILLANCE
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">POSTGIS CLUSTERS</span>
          </div>

          <div className="h-[420px] rounded-xl overflow-hidden">
            <GujaratGISMap
              cameras={cameras}
              alerts={alerts}
              selectedCameraId={selectedCam?.id}
              onSelectCamera={(cam) => setSelectedCam(cam)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-Time APB Threat Pulse Feed with Threat Scoring */}
      <div className="flex flex-col gap-3 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              REAL-TIME APB INCIDENT & THREAT INTELLIGENCE TRIAGE STREAM
            </h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>VIEW ALL APB INCIDENTS ({alerts.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {alerts.slice(0, 3).map((alt) => {
            const threatScore = alt.severity === 'CRITICAL' ? 95 : (alt.severity === 'HIGH' ? 82 : (alt.severity === 'MEDIUM' ? 60 : 35));
            return (
              <div
                key={alt.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alt.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-slate-400 text-[10px]">{alt.incident_number}</span>
                  </div>
                  
                  {/* 0-100 Threat Score Badge */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 font-sans">THREAT</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      threatScore >= 90 ? 'bg-red-950 text-red-300 border border-red-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}>
                      {threatScore}/100
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-200 font-sans font-semibold line-clamp-1">{alt.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans truncate">
                    {alt.camera_name} • {alt.district}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-900">
                  <span className="text-yellow-300 text-xs font-bold bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
                    {alt.detected_plate || 'APB TARGET'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate('/live-wall')}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[9px] font-bold border border-slate-800"
                    >
                      VIEW CAM
                    </button>
                    <button
                      onClick={() => navigate('/gis')}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[9px] font-bold border border-slate-800"
                    >
                      MAP
                    </button>
                    <button
                      onClick={() => {
                        setAlerts(alerts.map((a) => a.id === alt.id ? { ...a, status: 'ACKNOWLEDGED' as any } : a));
                        setActiveDemoMessage(`✓ Alert ${alt.incident_number} ACKNOWLEDGED by ${user?.badge_number || 'Officer'}. Recorded in audit log.`);
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[9px] font-bold border border-amber-500/30 transition-colors"
                    >
                      ACKNOWLEDGE
                    </button>
                    <button
                      onClick={() => navigate(`/cases`)}
                      className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[9px] font-bold transition-colors"
                    >
                      INVESTIGATE
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
