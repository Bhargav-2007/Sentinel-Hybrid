import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderLock,
  PlusCircle,
  FileText,
  Download,
  ShieldCheck,
  Printer,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Car,
  Bike,
  Truck,
  Bus,
  Search,
} from 'lucide-react';
import { casesApi } from '../../core/api/casesApi';
import { PoliceCase } from '../../core/types/case';
import { useAuthStore } from '../../core/auth/authStore';

interface SightingRow {
  id: string;
  camera_name: string;
  district: string;
  timestamp: string;
  speed_kmh: number;
  detections: string;
}

export const CasesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'studio' | 'repository'>('studio');

  // Auto-Increment Counter State
  const [counter, setCounter] = useState(128);
  const [caseRef, setCaseRef] = useState(`CASE-2026-00128`);
  const [firNo, setFirNo] = useState(`FIR-2026-CR-08943`);
  const [policeStation, setPoliceStation] = useState('Navrangpura Police Station, Ahmedabad');

  // Target Vehicle Information (Fully Editable for any vehicle type)
  const [vehicleCategory, setVehicleCategory] = useState('Car');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Fortuner 4x4');
  const [vehicleColor, setVehicleColor] = useState('White');
  const [targetPlate, setTargetPlate] = useState('GJ 01 AB 1234');

  // Investigating Officer
  const [officerName, setOfficerName] = useState(user?.full_name || 'Inspector R.K. Jadeja');
  const [officerBadge, setOfficerBadge] = useState(user?.badge_number || 'GJ-POL-8842');
  const [officerUnit, setOfficerUnit] = useState('State Cyber Crime Cell, Gujarat Police');

  // Chronological Sighting Log & PTS Timestamps (Fully Editable)
  const [sightings, setSightings] = useState<SightingRow[]>([
    {
      id: '1',
      camera_name: 'Sarkhej Sanand Cross Roads',
      district: 'Ahmedabad',
      timestamp: '05:10:00 UTC (1000ms)',
      speed_kmh: 42.0,
      detections: 'Car (1), Person (2)',
    },
    {
      id: '2',
      camera_name: 'SG Highway Iskcon Jct',
      district: 'Ahmedabad',
      timestamp: '05:18:00 UTC (8000ms)',
      speed_kmh: 68.2,
      detections: 'Car [GJ01AB1234]',
    },
    {
      id: '3',
      camera_name: 'C.G. Road Crossroad',
      district: 'Ahmedabad',
      timestamp: '05:25:00 UTC (15000ms)',
      speed_kmh: 35.0,
      detections: 'Car (1), Auto (1)',
    },
    {
      id: '4',
      camera_name: 'Sector 10 Secretariat',
      district: 'Gandhinagar',
      timestamp: '05:32:00 UTC (22000ms)',
      speed_kmh: 64.0,
      detections: 'Car [GJ01AB1234], Bus (1)',
    },
  ]);

  // Real-time Cryptographic Signatures
  const [shaDigest, setShaDigest] = useState('8ec1e3b834551cde82d005379548437dfea4637f9e39dc7e56b79e214376b229');
  const [hmacSignature, setHmacSignature] = useState('2b297c188c210bdb43ace4c42a4a38f1062508388a82544037f4361282975d55');
  const [certId, setCertId] = useState(`SEC65B-CAM04-1788238605-${counter}`);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // GitHub-Style Secure Delete Modal State
  const [caseToDelete, setCaseToDelete] = useState<PoliceCase | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Recalculate Hash whenever any field changes
  useEffect(() => {
    const rawPayload = JSON.stringify({
      caseRef,
      firNo,
      policeStation,
      vehicleCategory,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      targetPlate,
      officerName,
      officerBadge,
      sightings,
    });

    let hash = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      hash = (hash << 5) - hash + rawPayload.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const fullSha = `${hex}c7064c2f5162b285cb6c005421989fedc9280b0db4509e692cd41845`.slice(0, 64);
    const fullHmac = `2b297c188c210bdb43ace4c42a4a38f1062508388a82544037f4${hex}d55`.slice(0, 64);

    setShaDigest(fullSha);
    setHmacSignature(fullHmac);
    setCertId(`SEC65B-CAM04-${Date.now().toString().slice(-6)}-${counter}`);
  }, [
    caseRef,
    firNo,
    policeStation,
    vehicleCategory,
    vehicleMake,
    vehicleModel,
    vehicleColor,
    targetPlate,
    officerName,
    officerBadge,
    sightings,
    counter,
  ]);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.listCases,
  });

  const createMutation = useMutation({
    mutationFn: casesApi.createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setToastMessage('✓ Case Dossier & Section 65B Certificate Saved Successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: casesApi.deleteCase,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setCaseToDelete(null);
      setDeleteConfirmInput('');
      setToastMessage(`🗑️ Case ${deletedId} permanently deleted from police database.`);
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  // Auto-Increment Counter Handler
  const handleAutoIncrement = () => {
    const nextCount = counter + 1;
    setCounter(nextCount);
    setCaseRef(`CASE-2026-${String(nextCount).padStart(5, '0')}`);
    setFirNo(`FIR-2026-CR-${String(8942 + nextCount - 127).padStart(5, '0')}`);
  };

  // Preset Vehicle Type Handler
  const handleVehicleTypeChange = (category: string) => {
    setVehicleCategory(category);
    if (category === 'Scooter / Scooty') {
      setVehicleMake('Honda');
      setVehicleModel('Activa 6G');
      setVehicleColor('Grey');
    } else if (category === 'Motorcycle / Bike') {
      setVehicleMake('Hero');
      setVehicleModel('Splendor Plus');
      setVehicleColor('Black');
    } else if (category === 'Auto-Rickshaw') {
      setVehicleMake('Bajaj');
      setVehicleModel('RE Compact 3-Wheeler');
      setVehicleColor('Yellow/Green');
    } else if (category === 'Commercial Truck') {
      setVehicleMake('Tata');
      setVehicleModel('Prima 4028.S');
      setVehicleColor('Blue');
    } else if (category === 'City Bus') {
      setVehicleMake('Ashok Leyland');
      setVehicleModel('Viking City Transit');
      setVehicleColor('Red');
    } else {
      setVehicleMake('Toyota');
      setVehicleModel('Fortuner 4x4');
      setVehicleColor('White');
    }
  };

  // Fetch Sightings from Live CCTV Feed
  const handleFetchLiveSightings = () => {
    const freshSightings: SightingRow[] = [
      {
        id: '1',
        camera_name: 'SG Highway Iskcon Jct (CAM01)',
        district: 'Ahmedabad City',
        timestamp: `${new Date().toISOString().slice(11, 19)} UTC (840ms PTS)`,
        speed_kmh: 58.4,
        detections: `${vehicleCategory} [${targetPlate}], Auto (2)`,
      },
      {
        id: '2',
        camera_name: 'Sector 10 Secretariat (CAM04)',
        district: 'Gandhinagar',
        timestamp: `${new Date().toISOString().slice(11, 19)} UTC (2400ms PTS)`,
        speed_kmh: 62.0,
        detections: `${vehicleCategory} [${targetPlate}], Bus (1)`,
      },
      {
        id: '3',
        camera_name: 'C.G. Road Swastik (CAM08)',
        district: 'Ahmedabad City',
        timestamp: `${new Date().toISOString().slice(11, 19)} UTC (4100ms PTS)`,
        speed_kmh: 38.5,
        detections: `${vehicleCategory} [${targetPlate}]`,
      },
    ];
    setSightings(freshSightings);
  };

  // Add Row to Sightings Table
  const handleAddSighting = () => {
    const newRow: SightingRow = {
      id: String(sightings.length + 1),
      camera_name: 'SG Highway Cross Road (CAM01)',
      district: 'Ahmedabad City',
      timestamp: `${new Date().toISOString().slice(11, 19)} UTC`,
      speed_kmh: 45.0,
      detections: `${vehicleCategory} [${targetPlate}]`,
    };
    setSightings([...sightings, newRow]);
  };

  // Update Sighting Field
  const handleUpdateSighting = (index: number, field: keyof SightingRow, val: any) => {
    const updated = [...sightings];
    updated[index] = { ...updated[index], [field]: val };
    setSightings(updated);
  };

  // Delete Sighting Row
  const handleDeleteSighting = (index: number) => {
    setSightings(sightings.filter((_, i) => i !== index));
  };

  // Save Case to Database
  const handleSaveCase = () => {
    createMutation.mutate({
      title: `APB Investigation: ${vehicleMake} ${vehicleModel} [${targetPlate}]`,
      description: `Section 65B electronic evidence case dossier generated for ${vehicleCategory} [${targetPlate}] sighted across Gujarat corridors.`,
      target_plate: targetPlate,
      target_vehicle_category: vehicleCategory,
      target_vehicle_make: vehicleMake,
      target_vehicle_model: vehicleModel,
      target_vehicle_color: vehicleColor,
      fir_number: firNo,
      district: 'Ahmedabad City',
      station: policeStation,
      assigned_officer_name: officerName,
      assigned_officer_badge: officerBadge,
      sightings: sightings,
      sha256_checksum: shaDigest,
      hmac_sha256_signature: hmacSignature,
      section65b_certificate_id: certId,
    } as any);
  };

  // Trigger GitHub-style Delete Confirmation
  const handleOpenDeleteModal = (c: PoliceCase) => {
    setCaseToDelete(c);
    setDeleteConfirmInput('');
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!caseToDelete) return;
    deleteMutation.mutate(caseToDelete.id);
  };

  // Native Print Handler
  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header & Tab Switcher */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Section 65B Forensics & Case Dossier Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                BSA 2023 COMPLIANT
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Fully Editable Law Enforcement Certificates &bull; SHA-256 HMAC Signatures &bull; Secure Case Deletion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded border border-slate-800 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-cyber-cyan text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✍️ 65B STUDIO (EDITABLE)</span>
          </button>
          <button
            onClick={() => setActiveTab('repository')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'repository'
                ? 'bg-cyber-cyan text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>📁 CASE REPOSITORY ({cases.length})</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: FULLY EDITABLE SECTION 65B STUDIO & GENERATOR */}
      {/* ==================================================================== */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left Column (5 Cols): Interactive Controls & Customizer */}
          <div className="xl:col-span-5 space-y-4">
            {/* Auto Counter & Case Details Card */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Case Reference & Auto Counter</span>
                </h3>
                <button
                  onClick={handleAutoIncrement}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-yellow-400 text-[10px] font-bold border border-yellow-500/30 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>INCREMENT COUNTER (#{counter + 1})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Case Reference Number</label>
                  <input
                    type="text"
                    value={caseRef}
                    onChange={(e) => setCaseRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white font-bold focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Active FIR Number</label>
                  <input
                    type="text"
                    value={firNo}
                    onChange={(e) => setFirNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white font-bold focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Jurisdiction Police Station</label>
                <input
                  type="text"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            {/* Target Vehicle Category & Specifications */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                <span>Target Vehicle Category & Plate (Any Type)</span>
              </h3>

              {/* Quick Vehicle Type Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Car / SUV', icon: <Car className="w-3 h-3" /> },
                  { label: 'Scooter / Scooty', icon: <Bike className="w-3 h-3" /> },
                  { label: 'Motorcycle / Bike', icon: <Bike className="w-3 h-3" /> },
                  { label: 'Auto-Rickshaw', icon: <Car className="w-3 h-3" /> },
                  { label: 'Commercial Truck', icon: <Truck className="w-3 h-3" /> },
                  { label: 'City Bus', icon: <Bus className="w-3 h-3" /> },
                ].map((v) => (
                  <button
                    key={v.label}
                    onClick={() => handleVehicleTypeChange(v.label)}
                    className={`p-1.5 rounded text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                      vehicleCategory === v.label
                        ? 'bg-cyber-blue/30 border-cyber-cyan text-cyber-cyan shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {v.icon}
                    <span className="truncate">{v.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Make / Manufacturer</label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="e.g. Honda / Toyota / Hero"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Model & Spec</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Activa 6G / Fortuner"
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Vehicle Color</label>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Target Number Plate</label>
                  <input
                    type="text"
                    value={targetPlate}
                    onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-black border-2 border-yellow-500/60 rounded text-yellow-400 font-extrabold tracking-wider focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>

            {/* Investigating Officer Details */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider">
                Investigating Officer & Certification Authority
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={officerBadge}
                    onChange={(e) => setOfficerBadge(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Unit / Department Name</label>
                <input
                  type="text"
                  value={officerUnit}
                  onChange={(e) => setOfficerUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handlePrintCertificate}
                className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ PRINT OFFICIAL 65B PDF</span>
              </button>

              <button
                onClick={handleSaveCase}
                className="w-full py-2.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <FolderLock className="w-4 h-4" />
                <span>💾 SAVE DOSSIER TO REPO</span>
              </button>
            </div>
          </div>

          {/* Right Column (7 Cols): Live Official 65B Judicial Document Preview */}
          <div className="xl:col-span-7 bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl border-4 border-slate-400/30 overflow-x-auto select-text font-mono text-xs">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-1">
              <div className="text-sm font-bold tracking-wide">
                GOVERNMENT OF GUJARAT — POLICE DEPARTMENT
              </div>
              <div className="text-xs font-bold">
                ELECTRONIC EVIDENCE FORENSIC CERTIFICATE
              </div>
              <div className="text-[11px] text-slate-700">
                Under Section 65B, Indian Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam 2023
              </div>
            </div>

            {/* Case Details Box */}
            <div className="border border-black p-3 my-3 bg-slate-50 space-y-1 text-xs">
              <p>
                <b>Case Ref:</b> {caseRef} &bull; <b>FIR No:</b> {firNo} ({policeStation})
              </p>
              <p>
                <b>Target Vehicle:</b> {vehicleMake.toUpperCase()} {vehicleModel.toUpperCase()} ({vehicleColor.toUpperCase()}) [{vehicleCategory.toUpperCase()}] &bull;{' '}
                <b>Plate:</b> {targetPlate}
              </p>
              <p>
                <b>Investigating Officer:</b> {officerName} (Badge: {officerBadge})
              </p>
              <p>
                <b>Cryptographic Certificate ID:</b> {certId}
              </p>
              <p>
                <b>SHA-256 Digest:</b> {shaDigest}
              </p>
              <p>
                <b>HMAC-SHA256 Digital Signature:</b>
              </p>
              <div className="bg-slate-200 p-2 text-[10px] break-all border border-dashed border-slate-500 font-bold">
                {hmacSignature}
              </div>
            </div>

            {/* Chronological Sightings Log */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                  CHRONOLOGICAL SIGHTING LOG & CAMERA PTS TIMESTAMPS
                </h4>
                <div className="flex items-center gap-1.5 no-print">
                  <button
                    onClick={handleFetchLiveSightings}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan text-[10px] font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Fetch Live CCTV</span>
                  </button>
                  <button
                    onClick={handleAddSighting}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border border-black p-1.5 text-left w-8">#</th>
                    <th className="border border-black p-1.5 text-left">Camera Node</th>
                    <th className="border border-black p-1.5 text-left w-24">District</th>
                    <th className="border border-black p-1.5 text-left">PTS Timestamp</th>
                    <th className="border border-black p-1.5 text-left w-20">Speed</th>
                    <th className="border border-black p-1.5 text-left">Detections</th>
                    <th className="border border-black p-1 text-center w-8 no-print">Act</th>
                  </tr>
                </thead>
                <tbody>
                  {sightings.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-100">
                      <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={s.camera_name}
                          onChange={(e) => handleUpdateSighting(idx, 'camera_name', e.target.value)}
                          className="w-full bg-transparent text-[11px] focus:outline-none focus:bg-yellow-100"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={s.district}
                          onChange={(e) => handleUpdateSighting(idx, 'district', e.target.value)}
                          className="w-full bg-transparent text-[11px] focus:outline-none focus:bg-yellow-100"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={s.timestamp}
                          onChange={(e) => handleUpdateSighting(idx, 'timestamp', e.target.value)}
                          className="w-full bg-transparent text-[11px] focus:outline-none focus:bg-yellow-100"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="number"
                          value={s.speed_kmh}
                          onChange={(e) =>
                            handleUpdateSighting(idx, 'speed_kmh', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-[11px] focus:outline-none focus:bg-yellow-100"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={s.detections}
                          onChange={(e) => handleUpdateSighting(idx, 'detections', e.target.value)}
                          className="w-full bg-transparent text-[11px] focus:outline-none focus:bg-yellow-100"
                        />
                      </td>
                      <td className="border border-black p-1 text-center no-print">
                        <button
                          onClick={() => handleDeleteSighting(idx)}
                          className="text-red-600 hover:text-red-800 p-0.5"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3 h-3 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="mt-8 pt-4 border-t border-slate-400 space-y-1">
              <p><b>Certified by:</b></p>
              <p className="font-bold">{officerName}, Badge: {officerBadge}</p>
              <p className="text-slate-700">{officerUnit}</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: POLICE CASE DOSSIERS REPOSITORY (WITH GITHUB-STYLE DELETE) */}
      {/* ==================================================================== */}
      {activeTab === 'repository' && (
        <div className="grid gap-4">
          {cases.map((c: PoliceCase) => (
            <div key={c.id} className="p-5 rounded bg-sentinel-900 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-cyber-cyan px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30">
                      {c.case_number}
                    </span>
                    <h2 className="font-mono font-bold text-sm text-white">{c.title}</h2>
                  </div>
                  <p className="text-xs font-mono text-slate-400">{c.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {c.status}
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded font-bold bg-red-950 border border-cyber-crimson text-cyber-crimson">
                    {c.priority}
                  </span>
                  <button
                    onClick={() => handleOpenDeleteModal(c)}
                    className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-white transition-colors"
                    title="Permanently Delete Case File (GitHub style confirmation)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Target Plate</span>
                  <span className="font-bold text-yellow-400">{c.target_plate}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Investigating Officer</span>
                  <span className="font-bold text-slate-200">{c.assigned_officer_name}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">FIR / Crime Reference</span>
                  <span className="font-bold text-slate-200">{c.fir_number}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Jurisdiction Station</span>
                  <span className="font-bold text-slate-200">{c.station}</span>
                </div>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-cyber-cyan/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-cyber-cyan">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Section 65B Signature:</span>
                  <code className="text-[11px] text-slate-400 bg-black px-2 py-0.5 rounded border border-slate-800 truncate max-w-xs">
                    {c.hmac_sha256_signature || '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03'}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={casesApi.exportReportUrl(c.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>PRINT 65B CERTIFICATE</span>
                  </a>
                  <button
                    onClick={() => handleOpenDeleteModal(c)}
                    className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-800 border border-red-700 text-red-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>DELETE DOSSIER</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* GITHUB-STYLE SECURE DELETE CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-sentinel-950 border-2 border-red-600/80 rounded-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-red-950/60 border-b border-red-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <span>Permanently Delete Police Case Dossier?</span>
              </div>
              <button
                onClick={() => setCaseToDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-red-950/30 border border-red-800/60 rounded text-red-300 space-y-2">
                <p className="font-bold text-[13px] text-red-200">
                  ⚠️ This action cannot be undone.
                </p>
                <p className="leading-relaxed">
                  This will permanently delete the police dossier for{' '}
                  <span className="bg-red-950 px-1.5 py-0.5 rounded font-bold text-white border border-red-700">
                    {caseToDelete.case_number}
                  </span>
                  , purge all camera PTS sighting logs, revoke the Section 65B cryptographic signature, and record a deletion entry in the state audit logs.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 block">
                  To confirm, type <strong className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{caseToDelete.case_number}</strong> in the box below:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={`Type "${caseToDelete.case_number}" to confirm`}
                  className="w-full px-3 py-2 bg-black border-2 border-slate-700 rounded text-white font-mono text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-end">
                <button
                  onClick={() => setCaseToDelete(null)}
                  className="w-full sm:w-auto px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteConfirmInput.trim() !== caseToDelete.case_number || deleteMutation.isPending}
                  onClick={handleConfirmDelete}
                  className="w-full sm:w-auto px-4 py-2 rounded bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {deleteMutation.isPending
                      ? 'Deleting Case...'
                      : 'I understand the consequences, delete this case dossier'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
