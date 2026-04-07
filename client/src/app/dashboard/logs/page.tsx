"use client";

import { Lock, Loader2, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge"; 
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface AuditLog {
  id: number;
  queriedName?: string;
  query?: string;
  user?: { email: string } | string;
  status?: string;
  timestamp?: string;
  date?: string;
}

export default function LogsPage() {
  
  const { data: auditLogs = [], isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get('/audit/logs');
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300 text-sm">Audit Trail</p>
          <p className="text-blue-200/80 text-xs mt-1">View complete historical records of all sanctions screening queries, matches, and system activities. All entries are cryptographically signed for integrity verification.</p>
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">Immutable Audit Trail</h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase">All system queries are logged and signed.</p>
          </div>
          <div className="flex items-center space-x-2 text-green-500 bg-green-500/5 px-4 py-2 rounded-lg border border-green-500/10 font-bold text-xs">
            <Lock className="w-4 h-4" /> Integrity Active
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center text-blue-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <span className="font-bold text-sm uppercase tracking-wider">Loading records...</span>
          </div>
        ) : isError ? (
          <div className="p-12 flex flex-col justify-center items-center text-red-500">
            <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
            <span className="font-bold text-sm">Unable to load audit logs.</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium italic">
            No audit records available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0B0F14]/50 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4">Entry ID</th>
                  <th className="px-6 py-4">Search Term</th>
                  <th className="px-6 py-4">Queried By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: AuditLog) => {
                  const userEmail = typeof log.user === 'object' && log.user !== null ? log.user.email : log.user;
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-all border-b border-slate-800">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">#{log.id}</td>
                      <td className="px-6 py-4 font-bold text-white italic">&ldquo;{log.queriedName ?? log.query ?? '-'}&rdquo;</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {userEmail ?? 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={log.status?.toLowerCase() === 'critical' ? 'critical' : 'default'}>
                          {log.status ?? 'LOGGED'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-500 text-right">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US') : log.date ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}