"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from "next/navigation";
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  metadata: {
    queryName?: string;
    riskLevel?: string;
    matchedCount?: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['dashboard-logs'],
    queryFn: async () => {
      try {
        const response = await api.get('/audit/logs');
        return response.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const recentLogs = (auditLogs as AuditLog[]).slice(0, 5);

  const getCriticalCount = () => {
    return (auditLogs as AuditLog[]).filter(
      (log: AuditLog) => log.metadata?.riskLevel === 'CRITICAL' || log.metadata?.riskLevel === 'Exact Match'
    ).length;
  };

  const getTotalCount = () => auditLogs.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300 text-sm">System Overview</p>
          <p className="text-blue-200/80 text-xs mt-1">Monitor recent sanctions screening activities, match statistics, and system health metrics across your organization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">Critical Matches</p>
          <p className="text-3xl font-bold text-red-500">{getCriticalCount()}</p>
          <p className="text-[10px] text-slate-400 mt-2">High-risk alerts detected</p>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">Total Queries</p>
          <p className="text-3xl font-bold text-blue-500">{getTotalCount()}</p>
          <p className="text-[10px] text-slate-400 mt-2">Audit entries recorded</p>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">System Status</p>
          <p className="text-3xl font-bold text-green-500">Operational</p>
          <p className="text-[10px] text-slate-400 mt-2">All systems nominal</p>
        </div>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
          <h3 className="font-bold text-white tracking-tight">Recent Activity</h3>
          <button 
            onClick={() => router.push('/dashboard/search')}
            className="text-xs text-blue-500 hover:text-blue-400 hover:underline transition-all font-medium"
          >
            New Screening
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col justify-center items-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <span className="text-sm font-medium">Loading activity...</span>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic">
              No activity records found.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#0B0F14]/50 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-6 py-4">Task ID</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Search Term</th>
                  <th className="px-6 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {recentLogs.map((log: AuditLog) => {
                  const risk = log.metadata?.riskLevel?.toLowerCase() || 'clear';
                  const status = risk === 'critical' || risk === 'exact match' ? 'critical' : risk === 'high' ? 'critical' : risk === 'medium' ? 'warning' : 'clear';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 group-hover:text-slate-300">
                        {log.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="default" className="text-[10px] opacity-70">{log.action}</Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-white italic">
                        {log.metadata?.queryName || 'N/A'}
                        {log.metadata?.riskLevel && (
                          <span className="ml-2">
                             <Badge variant={status} className="text-[8px] h-4 px-1">{log.metadata.riskLevel}</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-xs font-medium">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 bg-[#0B0F14]/30 text-center border-t border-slate-800">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-[0.2em]">
            Data updates in real-time
          </p>
        </div>
      </div>

    </div>
  );
}