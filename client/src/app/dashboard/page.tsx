"use client";

import React from 'react';
import {Badge} from '@/components/ui/badge';
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  // Tasarımındaki Mock Data (Gerçek veriye bağlanmadan önceki hali)
  const INITIAL_AUDIT_LOGS = [
    { id: 'TX-9921', query: 'Ivan Petrov', user: 'admin@sanctionsguard.io', date: '2024-05-20 10:30', status: 'CRITICAL', hash: '0x88e1...4b2c' },
    { id: 'TX-9920', query: 'Global Tech Ltd', user: 'compliance_off@bank.com', date: '2024-05-20 09:15', status: 'CLEAR', hash: '0x4f12...9a3e' },
    { id: 'TX-9919', query: 'S. Al-Fayed', user: 'admin@sanctionsguard.io', date: '2024-05-19 16:45', status: 'WARNING', hash: '0x1c9d...7e5f' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Critical Matches */}
        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">Critical Matches</p>
          <p className="text-3xl font-bold text-red-500">12</p>
          <p className="text-[10px] text-slate-400 mt-2">Queries in last 24 hours</p>
        </div>

        {/* Total Queries */}
        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">Total Queries</p>
          <p className="text-3xl font-bold text-blue-500">1,248</p>
          <p className="text-[10px] text-slate-400 mt-2">Audit entries this month</p>
        </div>

        {/* System Accuracy */}
        <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">System Accuracy</p>
          <p className="text-3xl font-bold text-green-500">99.8%</p>
          <p className="text-[10px] text-slate-400 mt-2">Average AI match score</p>
        </div>
      </div>

      {/* RECENT SCANS TABLE */}
      <div className="bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
          <h3 className="font-bold text-white tracking-tight">Recent Scans</h3>
          <button 
            onClick={() => router.push('/dashboard/search')}
            className="text-xs text-blue-500 hover:text-blue-400 hover:underline transition-all font-medium"
          >
            Start Quick Scan
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0B0F14]/50 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-3">Query</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {INITIAL_AUDIT_LOGS.map((log) => {
                const statusVariant = log.status.toLowerCase() === 'critical' ? 'critical' : log.status.toLowerCase() === 'warning' ? 'warning' : log.status.toLowerCase() === 'clear' ? 'clear' : 'default';
                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 group-hover:text-slate-300">
                      {log.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-white italic">
                      {log.query}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant}>{log.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs font-medium">
                      {log.date}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Table footer */}
        <div className="p-4 bg-[#0B0F14]/30 text-center border-t border-slate-800">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-[0.2em]">
            Live audit data updates automatically
          </p>
        </div>
      </div>

    </div>
  );
}