import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  Navigation, 
  Car, 
  User, 
  ArrowRight,
  Lock,
  ChevronRight,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  fir_number?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'EVIDENCE_COLLECTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  target_plate?: string;
  target_vehicle_make?: string;
  target_vehicle_model?: string;
  target_vehicle_color?: string;
  district: string;
  station: string;
  assigned_officer_badge: string;
  assigned_officer_name: string;
  sightings: Array<{ camera_id: string; camera_name: string; timestamp: string; speed_kmh?: number; latitude: number; longitude: number }>;
  snapshots: string[];
  video_clips: string[];
  section65b_certificate_id?: string;
  hmac_sha256_signature?: string;
  case_notes: Array<{ author_badge: string; author_name: string; timestamp: string; action: string; note: string }>;
  created_at: string;
  updated_at?: string;
}

export const CasesPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const { openSection65BModal } = useUIStore();
  const queryClient = useQueryClient();

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // New Case Form State
  const [newTitle, setNewTitle] = useState('Hotlist Pursuit: Stolen White Fortuner GJ01AB1234');
  const [newPlate, setNewPlate] = useState('GJ01AB1234');
  const [newFir, setNewFir] = useState('FIR-2026-CR-08942');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');
  const [newDesc, setNewDesc] = useState('Target vehicle sighted across 4 SG Highway surveillance cameras. Requesting immediate interception.');

  // Mock initial cases
  const initialCases: CaseItem[] = [
    {
      id: 'case-01',
      case_number: 'CASE-2026-00127',
      title: 'APB Pursuit: Stolen Toyota Fortuner GJ01AB1234',
      description: 'Vehicle matched against eGujCop Hotlist FIR-2026-CR-08942. Traced across SG Highway corridor.',
      fir_number: 'FIR-2026-CR-08942',
      status: 'INVESTIGATING',
      priority: 'CRITICAL',
      target_plate: 'GJ01AB1234',
      target_vehicle_make: 'Toyota',
      target_vehicle_model: 'Fortuner',
      target_vehicle_color: 'White',
      district: 'Ahmedabad City',
      station: 'Navrangpura Police Station',
      assigned_officer_badge: 'GJ-POL-8842',
      assigned_officer_name: 'Inspector R.K. Jadeja',
      sightings: [
        { camera_id: '1', camera_name: 'SG Highway — Prahladnagar Junction', timestamp: '2026-08-31T06:10:00Z', speed_kmh: 68.2, latitude: 23.0125, longitude: 72.5085 },
        { camera_id: '3', camera_name: 'SG Highway — ISKCON Crossroad', timestamp: '2026-08-31T06:18:00Z', speed_kmh: 64.0, latitude: 23.0245, longitude: 72.5180 },
        { camera_id: '5', camera_name: 'SG Highway — Thaltej Junction', timestamp: '2026-08-31T06:26:00Z', speed_kmh: 72.5, latitude: 23.0550, longitude: 72.5290 },
      ],
      snapshots: ['/snapshots/GJ01AB1234_demo.jpg'],
      video_clips: ['/clips/sg_highway_pursuit.mp4'],
      section65b_certificate_id: 'CERT-65B-9984AF',
      hmac_sha256_signature: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
      case_notes: [
        { author_badge: 'GJ-POL-8842', author_name: 'Inspector R.K. Jadeja', timestamp: '2026-08-31T06:12:00Z', action: 'CASE_OPENED', note: 'Case initiated from high-confidence APB alert.' },
        { author_badge: 'GJ-POL-8842', author_name: 'Inspector R.K. Jadeja', timestamp: '2026-08-31T06:28:00Z', action: 'TRAJECTORY_SYNC', note: 'Traversed 3 camera junctions heading North towards Gandhinagar.' },
      ],
      created_at: '2026-08-31T06:12:00Z',
    },
    {
      id: 'case-02',
      case_number: 'CASE-2026-00094',
      title: 'Restricted Corridor Anomaly: Ashram Road BRTS Intrusion',
      description: 'Commercial vehicle observed driving wrong-way in dedicated rapid transit lane.',
      fir_number: 'FIR-2026-TR-04120',
      status: 'EVIDENCE_COLLECTED',
      priority: 'HIGH',
      target_plate: 'GJ27TT8842',
      target_vehicle_make: 'Tata',
      target_vehicle_model: '407',
      target_vehicle_color: 'Yellow',
      district: 'Ahmedabad City',
      station: 'Ellisbridge Police Station',
      assigned_officer_badge: 'GJ-POL-8812',
      assigned_officer_name: 'Patrol Operator Sharma',
      sightings: [
        { camera_id: '2', camera_name: 'Ashram Road — Income Tax Crossroad', timestamp: '2026-08-31T05:30:00Z', speed_kmh: 45.0, latitude: 23.0410, longitude: 72.5695 }
      ],
      snapshots: ['/snapshots/wrongway_demo.jpg'],
      video_clips: ['/clips/ashram_road_wrongway.mp4'],
      section65b_certificate_id: 'CERT-65B-4412BC',
      hmac_sha256_signature: '8f23ba0194bc028114ef018274ac918b01293847591028374829103948571029',
      case_notes: [
        { author_badge: 'GJ-POL-8812', author_name: 'Patrol Operator Sharma', timestamp: '2026-08-31T05:32:00Z', action: 'EVIDENCE_COLLECTED', note: 'Section 65B certified clip extracted for judicial prosecution.' }
      ],
      created_at: '2026-08-31T05:32:00Z',
    },
    {
      id: 'case-03',
      case_number: 'CASE-2026-00081',
      title: 'Night Patrol Clearance: SG Highway Overbridge Loitering',
      description: 'Suspicious individual loitering near critical infrastructure past midnight.',
      fir_number: 'FIR-2026-CR-07712',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      district: 'Ahmedabad City',
      station: 'Vastrapur Police Station',
      assigned_officer_badge: 'GJ-POL-8842',
      assigned_officer_name: 'Inspector R.K. Jadeja',
      sightings: [],
      snapshots: [],
      video_clips: [],
      case_notes: [
        { author_badge: 'GJ-POL-8842', author_name: 'Inspector R.K. Jadeja', timestamp: '2026-08-30T23:45:00Z', action: 'RESOLVED', note: 'PCR unit dispatched; identity verified and cleared.' }
      ],
      created_at: '2026-08-30T23:15:00Z',
    }
  ];

  const [casesList, setCasesList] = useState<CaseItem[]>(initialCases);

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: CaseItem = {
      id: `case-${Date.now()}`,
      case_number: `CASE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      title: newTitle,
      description: newDesc,
      fir_number: newFir,
      status: 'OPEN',
      priority: newPriority,
      target_plate: newPlate,
      target_vehicle_make: 'Toyota',
      target_vehicle_model: 'Fortuner',
      target_vehicle_color: 'White',
      district: user?.district || 'Ahmedabad City',
      station: user?.station || 'Navrangpura Police Station',
      assigned_officer_badge: user?.badge_number || 'GJ-POL-8842',
      assigned_officer_name: user?.full_name || 'Duty Investigator',
      sightings: [
        { camera_id: '1', camera_name: 'SG Highway — Prahladnagar Junction', timestamp: new Date().toISOString(), speed_kmh: 68.2, latitude: 23.0125, longitude: 72.5085 }
      ],
      snapshots: ['/snapshots/GJ01AB1234_demo.jpg'],
      video_clips: ['/clips/case_clip.mp4'],
      section65b_certificate_id: `CERT-65B-${Math.floor(100000 + Math.random() * 900000)}`,
      hmac_sha256_signature: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
      case_notes: [
        { author_badge: user?.badge_number || 'GJ-POL-8842', author_name: user?.full_name || 'Officer', timestamp: new Date().toISOString(), action: 'CASE_OPENED', note: newDesc }
      ],
      created_at: new Date().toISOString(),
    };

    setCasesList([newCase, ...casesList]);
    setCreateModalOpen(false);
    setSelectedCase(newCase);
  };

  const transitionCaseStatus = (caseId: string, nextStatus: CaseItem['status']) => {
    setCasesList((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const notes = [
            ...c.case_notes,
            {
              author_badge: user?.badge_number || 'GJ-POL-8842',
              author_name: user?.full_name || 'Officer',
              timestamp: new Date().toISOString(),
              action: `STATUS_TRANSITION_${nextStatus}`,
              note: `Status progressed to ${nextStatus}.`,
            },
          ];
          return { ...c, status: nextStatus, case_notes: notes, updated_at: new Date().toISOString() };
        }
        return c;
      })
    );

    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase((prev) => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  const filteredCases = casesList.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && c.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.case_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.target_plate && c.target_plate.toLowerCase().includes(q)) ||
        (c.fir_number && c.fir_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status: CaseItem['status']) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-950 text-blue-300 border-blue-500/40';
      case 'INVESTIGATING':
        return 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse';
      case 'EVIDENCE_COLLECTED':
        return 'bg-purple-950 text-purple-300 border-purple-500/40';
      case 'UNDER_REVIEW':
        return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const getPriorityBadge = (priority: CaseItem['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-950 text-red-300 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-950 text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-yellow-950 text-yellow-300 border-yellow-500/40';
      case 'LOW':
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              POLICE CASE INVESTIGATION & EVIDENCE LIFECYCLE
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              ALERT → ACKNOWLEDGED → INVESTIGATION → CASE → EVIDENCE → REVIEW → CLOSED
            </p>
          </div>
        </div>

        {hasPermission('case.create') && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-cyan-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE NEW CASE</span>
          </button>
        )}
      </div>

      {/* Main Grid: Cases List (5 cols) + Case Dossier View (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filterable Case Queue */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Search & Filters */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case #, plate, or FIR..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="EVIDENCE_COLLECTED">Evidence Collected</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved / Closed</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Cases List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredCases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                      : 'bg-[#080d1a] border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 font-mono">{c.case_number}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-200 font-sans line-clamp-1">{c.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans truncate">
                      {c.fir_number || 'No FIR'} • {c.assigned_officer_name}
                    </p>
                  </div>

                  {c.target_plate && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-900">
                      <span className="text-yellow-300 text-xs font-bold bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
                        {c.target_plate}
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Dossier Details */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedCase ? (
            <div className="bg-[#090e1a] border border-slate-800 p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-cyan-400 font-mono">{selectedCase.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(selectedCase.priority)}`}>
                      {selectedCase.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(selectedCase.status)}`}>
                      {selectedCase.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-100 font-sans mt-1">{selectedCase.title}</h2>
                </div>

                <button
                  onClick={() => openSection65BModal(selectedCase.case_number)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-all shrink-0"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>SEC 65B CERTIFICATE</span>
                </button>
              </div>

              {/* Status Progression Stepper */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Investigation Lifecycle:</span>
                <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-center">
                  {(['OPEN', 'INVESTIGATING', 'EVIDENCE_COLLECTED', 'UNDER_REVIEW', 'RESOLVED'] as const).map((step, idx) => {
                    const isPassed = ['OPEN', 'INVESTIGATING', 'EVIDENCE_COLLECTED', 'UNDER_REVIEW', 'RESOLVED'].indexOf(selectedCase.status) >= idx;
                    return (
                      <button
                        key={step}
                        disabled={!hasPermission('case.manage')}
                        onClick={() => transitionCaseStatus(selectedCase.id, step)}
                        className={`py-1.5 rounded-lg border transition-all ${
                          selectedCase.status === step
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                            : isPassed
                            ? 'bg-slate-900 text-slate-300 border-slate-700'
                            : 'bg-slate-950 text-slate-600 border-slate-900'
                        }`}
                      >
                        {step.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Case Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500">TARGET VEHICLE</span>
                  <p className="text-yellow-300 font-bold">{selectedCase.target_plate || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">FIR REFERENCE</span>
                  <p className="text-slate-200 font-bold">{selectedCase.fir_number || 'GD Register'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">ASSIGNED INVESTIGATOR</span>
                  <p className="text-slate-200 font-bold">{selectedCase.assigned_officer_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">DISTRICT</span>
                  <p className="text-slate-300">{selectedCase.district}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">POLICE STATION</span>
                  <p className="text-slate-300">{selectedCase.station}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">CREATED AT</span>
                  <p className="text-slate-300">{new Date(selectedCase.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Multi-Camera Sightings Timeline */}
              {selectedCase.sightings && selectedCase.sightings.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <span>CORRELATED SIGHTINGS TIMELINE ({selectedCase.sightings.length})</span>
                  </div>

                  <div className="space-y-2">
                    {selectedCase.sightings.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                            #{sIdx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-200">{s.camera_name}</p>
                            <span className="text-[10px] text-slate-400 font-sans">{new Date(s.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {s.speed_kmh && (
                          <span className="text-cyan-400 font-bold text-xs">{s.speed_kmh} km/h</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cryptographic Proof Hash */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-slate-400">HMAC-SHA256 DIGITAL SIGNATURE:</span>
                </div>
                <span className="text-emerald-300 font-mono text-[10px] truncate max-w-[240px]">
                  {selectedCase.hmac_sha256_signature || 'VERIFIED_AUTHENTIC'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#090e1a] border border-slate-800 p-12 rounded-2xl text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <Briefcase className="w-10 h-10 text-slate-700" />
              <span>Select a case from the list on the left to inspect the complete investigation dossier.</span>
            </div>
          )}
        </div>
      </div>

      {/* New Case Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border border-slate-800 max-w-lg w-full rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">OPEN NEW INVESTIGATION CASE</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold">Case Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold">Target Vehicle Plate</label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-yellow-300 font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold">FIR / GD Number</label>
                  <input
                    type="text"
                    value={newFir}
                    onChange={(e) => setNewFir(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="CRITICAL">CRITICAL (Immediate APB Pursuit)</option>
                  <option value="HIGH">HIGH (Supervised Investigation)</option>
                  <option value="MEDIUM">MEDIUM (Standard Inquiry)</option>
                  <option value="LOW">LOW (Observation Only)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Case Narrative / Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  INITIALIZE CASE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
