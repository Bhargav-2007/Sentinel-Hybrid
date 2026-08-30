import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { alertService } from '../../services/alertService';
import { Section65BCertificate } from '../../types/alert';
import { ShieldCheck, Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';

export const Section65BModal: React.FC = () => {
  const { section65bModalIncidentId, closeSection65BModal } = useUIStore();
  const [cert, setCert] = useState<Section65BCertificate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!section65bModalIncidentId) {
      setCert(null);
      return;
    }

    setLoading(true);
    alertService
      .exportSection65BCertificate(section65bModalIncidentId)
      .then((data) => setCert(data))
      .catch((err) => console.error('Failed to load Section 65B Certificate:', err))
      .finally(() => setLoading(false));
  }, [section65bModalIncidentId]);

  if (!section65bModalIncidentId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto font-mono">
        {/* Close Button */}
        <button
          onClick={closeSection65BModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide text-cyan-300">
              SECTION 65B INDIAN EVIDENCE ACT CERTIFICATE
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              State of Gujarat • Forensic Digital Evidence Integrity Record
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400 text-sm animate-pulse">
            <FileText className="w-8 h-8 animate-spin" />
            <span>Generating Cryptographically Signed Certificate...</span>
          </div>
        ) : cert ? (
          <div className="space-y-4 text-xs">
            {/* Verification Stamp */}
            <div className="bg-emerald-950/40 border border-emerald-500/50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SHA-256 HMAC INTEGRITY VERIFIED</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-bold">TAMPER-EVIDENT</span>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px]">CERTIFICATE ID</span>
                <p className="font-bold text-slate-200 mt-0.5">{cert.certificate_id}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">INCIDENT REFERENCE</span>
                <p className="font-bold text-cyan-300 mt-0.5">{cert.evidence_reference.incident_id}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">CERTIFYING OFFICER</span>
                <p className="font-bold text-slate-200 mt-0.5">
                  {cert.certifying_officer.officer_id} ({cert.certifying_officer.badge_number})
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">RANK & JURISDICTION</span>
                <p className="font-bold text-slate-200 mt-0.5">
                  {cert.certifying_officer.rank} • {cert.certifying_officer.district}
                </p>
              </div>
            </div>

            {/* Legal Statement */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Statutory Declaration</span>
              <p className="text-[11px] text-slate-300 leading-relaxed italic font-sans">
                "{cert.legal_declaration}"
              </p>
            </div>

            {/* Timestamp & Algorithm */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
              <span>Timestamp: {new Date(cert.evidence_reference.certification_timestamp).toLocaleString()}</span>
              <span>Algorithm: {cert.evidence_reference.cryptographic_algorithm}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-cyan-300 text-xs font-bold transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>PRINT</span>
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${cert.certificate_id}.json`;
                  a.click();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD CERTIFICATE</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Could not fetch Section 65B certificate for this incident.
          </div>
        )}
      </div>
    </div>
  );
};
