import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ListOrdered,
  ShieldAlert,
  PlusCircle,
  Trash2,
  Eye,
  CheckCircle,
  X,
  Plus,
  Car,
  Bike,
  Truck,
  Bus,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../core/api/client';

interface WatchlistItem {
  id: string;
  plate_number: string;
  category: string;
  priority: string;
  vehicle_category?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  fir_number?: string;
  police_station?: string;
  assigned_officer?: string;
  added_date?: string;
}

export const WatchlistsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState('STOLEN_VEHICLE');
  const [priority, setPriority] = useState('CRITICAL');
  const [vehicleCategory, setVehicleCategory] = useState('Car / SUV');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Fortuner 4x4');
  const [vehicleColor, setVehicleColor] = useState('White');
  const [firNumber, setFirNumber] = useState(`FIR-2026-CR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [policeStation, setPoliceStation] = useState('Navrangpura Police Station, Ahmedabad');
  const [assignedOfficer, setAssignedOfficer] = useState('Inspector R.K. Jadeja');

  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await apiClient<any>('/api/v1/watchlist');
      return Array.isArray(res) ? res : res.watchlist || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient('/api/v1/watchlist', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setShowAddModal(false);
      setToastMessage(`✓ Target ${plateNumber.toUpperCase()} added to eGujCop Hotlist.`);
      setTimeout(() => setToastMessage(null), 4000);
      setPlateNumber('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (plate: string) => {
      return apiClient(`/api/v1/watchlist/${plate}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, deletedPlate) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setToastMessage(`🗑️ Target ${deletedPlate} removed from active hotlist.`);
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  const handleVehicleTypeChange = (cat: string) => {
    setVehicleCategory(cat);
    if (cat === 'Scooter / Scooty') {
      setVehicleMake('Honda');
      setVehicleModel('Activa 6G');
      setVehicleColor('Grey');
    } else if (cat === 'Motorcycle / Bike') {
      setVehicleMake('Hero');
      setVehicleModel('Splendor Plus');
      setVehicleColor('Black');
    } else if (cat === 'Auto-Rickshaw') {
      setVehicleMake('Bajaj');
      setVehicleModel('RE Compact');
      setVehicleColor('Yellow/Green');
    } else if (cat === 'Commercial Truck') {
      setVehicleMake('Tata');
      setVehicleModel('407 LCV');
      setVehicleColor('Yellow');
    } else if (cat === 'City Bus') {
      setVehicleMake('Ashok Leyland');
      setVehicleModel('Viking Transit');
      setVehicleColor('Red');
    } else {
      setVehicleMake('Toyota');
      setVehicleModel('Fortuner 4x4');
      setVehicleColor('White');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;

    addMutation.mutate({
      plate_number: plateNumber.trim().toUpperCase(),
      category,
      priority,
      vehicle_category: vehicleCategory,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_color: vehicleColor,
      fir_number: firNumber,
      police_station: policeStation,
      assigned_officer: assignedOfficer,
    });
  };

  const items: WatchlistItem[] = watchlistData || [];

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-crimson/15 border border-cyber-crimson/30 text-cyber-crimson">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              eGujCop Criminal Watchlists & Hotlist Hot-Sync
            </h1>
            <p className="text-xs text-slate-400">
              Statewide Stolen Auto Hotlist &bull; Wanted Suspect FIR Registry &bull; Real-time AI Interception
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded bg-cyber-crimson hover:bg-red-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-glow-crimson"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ADD HOTLIST TARGET</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Watchlist Cards */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-xs text-cyber-cyan">
          Syncing eGujCop State Watchlists...
        </div>
      ) : (
        <div className="grid gap-3 text-xs">
          {items.map((item) => (
            <div
              key={item.plate_number || item.id}
              className="p-4 rounded bg-sentinel-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-yellow-400 bg-black px-2 py-0.5 rounded border border-slate-700">
                      {item.plate_number}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-950 text-cyber-crimson border border-cyber-crimson/40">
                      {item.priority || 'HIGH'}
                    </span>
                    <span className="font-bold text-slate-300">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    {item.vehicle_make} {item.vehicle_model} ({item.vehicle_color}) &bull;{' '}
                    <b className="text-slate-300">{item.fir_number}</b> ({item.police_station})
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Assigned Officer: {item.assigned_officer} &bull; Added: {item.added_date || '2026-09-01'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => navigate(`/investigate?plate=${item.plate_number}`)}
                  className="px-3 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold transition-all flex items-center gap-1 text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>INVESTIGATE 360°</span>
                </button>
                <button
                  onClick={() => deleteMutation.mutate(item.plate_number)}
                  className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white transition-colors"
                  title="Remove from Hotlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Hotlist Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-sentinel-950 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-sentinel-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyber-crimson font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Add Vehicle to eGujCop Hotlist Registry</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Target Number Plate *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. GJ01AB1234 or GJ05CD3311"
                  className="w-full px-3 py-2 bg-black border-2 border-yellow-500/60 rounded text-yellow-400 font-extrabold text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Vehicle Category Picker */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Vehicle Category</label>
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
                      type="button"
                      key={v.label}
                      onClick={() => handleVehicleTypeChange(v.label)}
                      className={`p-1.5 rounded text-[10px] font-bold border flex items-center justify-center gap-1 ${
                        vehicleCategory === v.label
                          ? 'bg-cyber-blue/30 border-cyber-cyan text-cyber-cyan'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {v.icon}
                      <span className="truncate">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Make / Model</label>
                  <input
                    type="text"
                    value={`${vehicleMake} ${vehicleModel}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(' ');
                      setVehicleMake(parts[0] || '');
                      setVehicleModel(parts.slice(1).join(' '));
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Offense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  >
                    <option value="STOLEN_VEHICLE">STOLEN VEHICLE (IPC 379)</option>
                    <option value="WANTED_SUSPECT_VEHICLE">WANTED SUSPECT VEHICLE</option>
                    <option value="HIT_AND_RUN">HIT AND RUN PURSUIT</option>
                    <option value="ILLEGAL_SMUGGLING">ILLEGAL CONTRABAND</option>
                    <option value="WRONG_WAY_INTRUSION">WRONG WAY INTRUSION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">FIR Number</label>
                  <input
                    type="text"
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Police Station</label>
                  <input
                    type="text"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-4 py-2 rounded bg-cyber-crimson hover:bg-red-600 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addMutation.isPending ? 'ADDING...' : 'ADD TO HOTLIST'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
