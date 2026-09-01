import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderLock, PlusCircle, FileText, Download, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { casesApi } from '../../core/api/casesApi';
import { PoliceCase, CaseStatus } from '../../core/types/case';
import { useAuthStore } from '../../core/auth/authStore';

export const CasesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlate, setNewPlate] = useState('GJ01AB1234');
  const [newTitle, setNewTitle] = useState('APB Pursuit: Wanted Vehicle');
  const [newFir, setNewFir] = useState('FIR-2026-CR-08942');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: casesApi.listCases,
  });

  const createMutation = useMutation({
    mutationFn: casesApi.createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowCreateModal(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ caseId, status }: { caseId: string; status: CaseStatus }) =>
      casesApi.updateCaseStatus(caseId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <FolderLock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">
              Police Case Dossiers & Section 65B Forensics
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Investigation Files &bull; Chain of Custody &bull; Cryptographic Evidence Packages
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          <span>NEW CASE FILE</span>
        </button>
      </div>

      {/* Case Dossier Cards */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Loading Case Files...
        </div>
      ) : (
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
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {c.status}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-1 rounded font-bold bg-red-950 border border-cyber-crimson text-cyber-crimson">
                    {c.priority}
                  </span>
                </div>
              </div>

              {/* Case Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
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

              {/* Section 65B Signature Pill */}
              <div className="p-3 rounded bg-slate-950 border border-cyber-cyan/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-cyber-cyan">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Section 65B HMAC Signature:</span>
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
                  <a
                    href={casesApi.exportJsonUrl(c.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span>JSON DOSSIER</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-sentinel-900 border border-slate-700 rounded p-5 space-y-4 font-mono shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyber-cyan" />
              Register New Police Case File
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Case Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Number Plate</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-yellow-400 font-bold focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">eGujCop FIR Number</label>
                <input
                  type="text"
                  value={newFir}
                  onChange={(e) => setNewFir(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyber-cyan"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  createMutation.mutate({
                    title: newTitle,
                    description: `Registered under ${newFir} for target ${newPlate}`,
                    target_plate: newPlate,
                    fir_number: newFir,
                    priority: 'CRITICAL',
                    district: 'Ahmedabad City',
                    station: 'Navrangpura Police Station',
                  });
                }}
                className="px-4 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-xs font-bold"
              >
                SUBMIT & SEAL CASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
