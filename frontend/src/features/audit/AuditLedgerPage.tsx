import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { auditApi, AuditLogEntry } from '../../core/api/auditApi';

export const AuditLedgerPage: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const {
    data: logs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs', limit, selectedAction],
    queryFn: () => auditApi.getLogs(limit, selectedAction || undefined),
    refetchInterval: 15000,
  });

  const handleCopyHash = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.officer_badge.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(q)) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(q)) ||
      (log.hmac_signature && log.hmac_signature.toLowerCase().includes(q))
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('BREAK_GLASS') || action.includes('DELETE') || action.includes('TERMINATE')) {
      return 'bg-red-950 text-red-400 border-red-700/50';
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-blue-950 text-blue-400 border-blue-700/50';
    }
    if (action.includes('DISPATCH') || action.includes('ALERT')) {
      return 'bg-amber-950 text-amber-400 border-amber-700/50';
    }
    if (action.includes('CASE') || action.includes('EXPORT')) {
      return 'bg-purple-950 text-purple-400 border-purple-700/50';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-4 font-mono text-xs text-slate-200">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-purple-950 border border-purple-500/30 text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              Section 65B Forensic Audit Trail & Cryptographic Ledger
            </h1>
            <p className="text-[11px] text-slate-400">
              Indian Evidence Act Section 65B Compliance &bull; HMAC-SHA256 Chaining &bull; Immutable Officer Action Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>SYNC LEDGER</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded bg-sentinel-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Officer Badge, Entity ID, Action, or HMAC Signature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan font-mono"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              aria-label="Filter audit logs by action"
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan font-mono cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="OFFICER_LOGIN">OFFICER_LOGIN</option>
              <option value="BREAK_GLASS_ACTIVATED">BREAK_GLASS_ACTIVATED</option>
              <option value="CASE_CREATED">CASE_CREATED</option>
              <option value="CASE_DELETED">CASE_DELETED</option>
              <option value="AUTO_DISPATCH">AUTO_DISPATCH</option>
              <option value="WATCHLIST_MATCH">WATCHLIST_MATCH</option>
              <option value="EVIDENCE_EXPORT">EVIDENCE_EXPORT</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">Show:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Audit log entries display limit"
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono cursor-pointer"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
          <span className="text-[11px] px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
            {filteredLogs.length} Records
          </span>
        </div>
      </div>

      {/* Forensic Audit Table */}
      <div className="rounded border border-slate-800 bg-sentinel-900 overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950 border-b border-slate-800 font-bold text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Cryptographically Verified Audit Entries (SHA-256 HMAC Chained)</span>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <FileCheck className="w-3.5 h-3.5" /> Indian Evidence Act § 65B Compliant
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-cyber-cyan flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyber-cyan" />
            <span>Verifying Digital Signatures and Loading Audit Ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono space-y-2">
            <Terminal className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-400">0 Audit Trail Records Found in Current Partition</p>
            <p className="text-xs text-slate-600">
              No audit records matched the filter criteria or no privileged operations have been logged yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Timestamp (UTC)</th>
                  <th className="p-2.5">Officer Badge</th>
                  <th className="p-2.5">Action Executed</th>
                  <th className="p-2.5">Entity Reference</th>
                  <th className="p-2.5">Client IP</th>
                  <th className="p-2.5">HMAC-SHA256 Signature</th>
                  <th className="p-2.5 text-center w-16">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredLogs.map((entry, idx) => {
                  const isExpanded = expandedRowId === entry.id;
                  const detailsString =
                    typeof entry.details === 'object'
                      ? JSON.stringify(entry.details, null, 2)
                      : String(entry.details || 'N/A');

                  return (
                    <React.Fragment key={entry.id || idx}>
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="p-2.5 text-slate-300 whitespace-nowrap">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-2.5 font-bold text-cyber-cyan whitespace-nowrap">
                          {entry.officer_badge}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                              entry.action
                            )}`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {entry.entity_type ? (
                            <span className="text-slate-400">
                              {entry.entity_type}:{' '}
                              <span className="text-white font-bold">{entry.entity_id || 'N/A'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-400 whitespace-nowrap">{entry.ip_address || '127.0.0.1'}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5 max-w-[200px]">
                            <span className="truncate text-slate-400 font-mono text-[10px]" title={entry.hmac_signature}>
                              {entry.hmac_signature ? `${entry.hmac_signature.slice(0, 16)}...` : 'N/A'}
                            </span>
                            {entry.hmac_signature && (
                              <button
                                onClick={() => handleCopyHash(entry.hmac_signature, entry.id)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy Full HMAC Hash"
                              >
                                {copiedId === entry.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : entry.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Toggle JSON Details"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={8} className="p-4 border-t border-slate-800/80">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                <span className="font-bold text-cyber-cyan">
                                  FORENSIC METADATA PAYLOAD (LOG ID: {entry.id})
                                </span>
                                <span className="font-mono text-slate-500">
                                  Full HMAC: {entry.hmac_signature}
                                </span>
                              </div>
                              <pre className="p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-emerald-400 overflow-x-auto font-mono">
                                {detailsString}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
