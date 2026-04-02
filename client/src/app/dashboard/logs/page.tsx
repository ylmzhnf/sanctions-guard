"use client";

import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function LogsPage() {
  const auditLogs = [
    { id: 'TX-9921', query: 'Ivan Petrov', user: 'admin@sanctionsguard.io', date: '2024-05-20 10:30', status: 'CRITICAL', hash: '0x88e1...4b2c' },
    { id: 'TX-9920', query: 'Global Tech Ltd', user: 'compliance_off@bank.com', date: '2024-05-20 09:15', status: 'CLEAR', hash: '0x4f12...9a3e' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
          <div><h3 className="font-bold text-white text-lg tracking-tight">Immutable Audit Trail</h3><p className="text-[10px] text-slate-500 mt-1 uppercase">Entries are sealed with SHA-256.</p></div>
          <div className="flex items-center space-x-2 text-green-500 bg-green-500/5 px-4 py-2 rounded-lg border border-green-500/10 font-bold text-xs"><Lock className="w-4 h-4" /> Integrity Active</div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 text-[10px] text-slate-500 uppercase"><tr className="border-b border-slate-800"><th className="px-6 py-4">ID</th><th className="px-6 py-4">Query</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Hash</th></tr></thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {auditLogs.map(log => {
              const statusVariant = log.status.toLowerCase() === 'critical' ? 'critical' : log.status.toLowerCase() === 'danger' ? 'critical' : log.status.toLowerCase() === 'clear' ? 'clear' : log.status.toLowerCase() === 'warning' ? 'warning' : 'default';
              return (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-all">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.id}</td>
                  <td className="px-6 py-4 font-bold text-white">{log.query}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{log.user}</td>
                  <td className="px-6 py-4"><Badge variant={statusVariant}>{log.status}</Badge></td>
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-600">{log.hash}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}