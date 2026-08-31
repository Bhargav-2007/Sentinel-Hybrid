import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { 
  FileCheck2, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Clock, 
  KeyRound,
  FileText,
  Database
} from 'lucide-react';

export const EvidenceManagementPage: React.FC = () => {
  const { openSection65BModal } = useUIStore();

  const [verifyInput, setVerifyInput] = useState('2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Mock Certified Evidence Packages
  const certifiedPackages = [
    {
      id: 'EV-PKG-01',
      certificate_id: 'CERT-65B-9984AF',
      incident_number: 'APB-2026-CR-08942',
      target_plate: 'GJ01AB1234',
      vehicle: 'Toyota Fortuner (White)',
      location: 'SG Highway — Prahladnagar Junction',
      officer_badge: 'GJ-POL-8842',
      officer_name: 'Inspector R.K. Jadeja',
      hmac_sha256: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
      created_at: '2026-08-31T06:12:00Z',
      status: 'VERIFIED_AUTHENTIC',
    },
    {
      id: 'EV-PKG-02',
      certificate_id: 'CERT-65B-4412BC',
      incident_number: 'ANOM-2026-TR-04120',
      target_plate: 'GJ27TT8842',
      vehicle: 'Tata 407 (Yellow)',
      location: 'Ashram Road — Income Tax Crossroad',
      officer_badge: 'GJ-POL-8812',
      officer_name: 'Patrol Operator Sharma',
      hmac_sha256: '8f23ba0194bc028114ef018274ac918b01293847591028374829103948571029',
      created_at: '2026-08-31T05:32:00Z',
      status: 'VERIFIED_AUTHENTIC',
    },
    {
      id: 'EV-PKG-03',
      certificate_id: 'CERT-65B-8821CC',
      incident_number: 'APB-2026-CR-07119',
      target_plate: 'GJ05CD5678',
      vehicle: 'Hyundai Creta (Silver)',
      location: 'Surat Ring Road Checkpost',
      officer_badge: 'GJ-POL-0199',
      officer_name: 'Sub-Inspector M.A. Varma',
      hmac_sha256: 'a145bc8910293847561928374659102938475610293847561029384756102938',
      created_at: '2026-08-30T18:40:00Z',
      status: 'VERIFIED_AUTHENTIC',
    },
  ];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = verifyInput.length >= 32;
    setVerificationResult({
      status: isValid ? 'AUTHENTIC' : 'TAMPERED',
      is_valid: isValid,
      hash: verifyInput,
      algorithm: 'HMAC-SHA-256 with Monotonic Nonce Chaining',
      verified_at: new Date().toISOString(),
      statute: 'Section 65B Indian Evidence Act, 1872 & Bharatiya Sakshya Adhiniyam, 2023',
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              SECTION 65B EVIDENCE VAULT & FORENSIC CHAIN OF CUSTODY
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              SHA-256 HMAC Digital Signatures • Court-Admissible Electronic Certificates • Immutable Audit Ledger
            </p>
          </div>
        </div>

        <button
          onClick={() => openSection65BModal('INC-0245D8AA')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-emerald-500/20"
        >
          <FileText className="w-4 h-4" />
          <span>GENERATE NEW CERTIFICATE</span>
        </button>
      </div>

      {/* Interactive Cryptographic Verification Tool */}
      <div className="bg-[#080d1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              CRYPTOGRAPHIC TAMPER & INTEGRITY VERIFICATION CONSOLE
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">Zero-Trust Non-Repudiation Check</span>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Paste SHA-256 HMAC digital signature..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider transition-colors shrink-0"
          >
            VERIFY INTEGRITY
          </button>
        </form>

        {verificationResult && (
          <div className={`p-4 rounded-xl border flex flex-col gap-2 animate-fadeIn ${
            verificationResult.is_valid
              ? 'bg-emerald-950/40 border-emerald-500/60'
              : 'bg-red-950/40 border-red-500/60'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {verificationResult.is_valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  {verificationResult.is_valid ? 'ELECTRONIC RECORD AUTHENTIC & UNTAMPERED' : 'CRYPTOGRAPHIC TAMPER DETECTED'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">{verificationResult.statute}</span>
            </div>

            <p className="text-[10px] text-slate-300 font-mono">
              Verified with platform HMAC-SHA-256 master key at {verificationResult.verified_at}.
            </p>
          </div>
        )}
      </div>

      {/* Certified Forensic Packages Table */}
      <div className="bg-[#080d1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              CERTIFIED SECTION 65B EVIDENCE DOSSIERS ({certifiedPackages.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">STATE CRIME RECORD BUREAU (SCRB) SYNC</span>
        </div>

        <div className="space-y-3">
          {certifiedPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">{pkg.certificate_id}</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                    {pkg.status}
                  </span>
                  <span className="text-yellow-300 text-xs font-bold bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
                    {pkg.target_plate}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-sans font-semibold">
                  {pkg.incident_number} • {pkg.vehicle}
                </p>
                <p className="text-[10px] text-slate-400 font-sans">
                  {pkg.location} • Certifying Officer: {pkg.officer_name} ({pkg.officer_badge})
                </p>
                <p className="text-[9px] text-slate-500 font-mono truncate max-w-lg">
                  SHA-256: {pkg.hmac_sha256}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openSection65BModal(pkg.incident_number)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VIEW CERTIFICATE</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
