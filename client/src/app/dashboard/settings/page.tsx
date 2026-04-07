"use client";

import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, Settings, Key, Sliders, Users, ChevronDown, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const mockUsers = [
    { id: 1, name: "Alice Johnson", email: "alice@company.com", role: "ADMIN", status: "Active" },
    { id: 2, name: "Bob Smith", email: "bob@company.com", role: "USER", status: "Active" },
    { id: 3, name: "Charlie Davis", email: "charlie@company.com", role: "USER", status: "Inactive" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {!isAdmin && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          <div className="flex-1">
            <p className="font-bold text-red-400 text-sm uppercase tracking-wider">View-Only Mode</p>
            <p className="text-red-200/80 text-xs mt-0.5">
              You are logged in as a standard USER. Administrator privileges are required to modify system settings or manage users.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
          <Settings className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administration Panel</h1>
          <p className="text-sm text-slate-400">Configure core engine parameters and manage system access</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* System Configurations Section */}
        <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-400" />
            <h2 className="font-bold text-white uppercase text-xs tracking-widest">System Configurations</h2>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Fuzzy Match Slider */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Fuzzy Match Threshold</h3>
                  <p className="text-xs text-slate-400">Minimum structural similarity score for hit detection</p>
                </div>
                <span className="text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded text-sm">85%</span>
              </div>
              <input 
                type="range" 
                min="50" max="100" defaultValue="85"
                disabled={!isAdmin}
                className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'accent-blue-500'}`}
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium uppercase">
                <span>Loose (50%)</span>
                <span>Strict (100%)</span>
              </div>
            </div>

            <div className="h-px bg-slate-800"></div>

            {/* API Key Generation */}
            <div>
               <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">External API Key</h3>
                    <Badge variant="warning" className="text-[9px] uppercase px-1.5 py-0">Secret</Badge>
                  </div>
                  <p className="text-xs text-slate-400">Used for programmatic access to the screening engine</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    value="sk_live_1234567890abcdef"
                    readOnly
                    className="w-full bg-[#0B0F14] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-300 text-sm outline-none"
                  />
                </div>
                <button 
                  disabled={!isAdmin}
                  className={`px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg border border-slate-700 transition-colors ${isAdmin ? 'hover:bg-slate-700' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                disabled={!isAdmin}
                className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg transition-all ${isAdmin ? 'hover:bg-blue-500 shadow-lg shadow-blue-500/20' : 'opacity-50 cursor-not-allowed'}`}
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="font-bold text-white uppercase text-xs tracking-widest">User Management</h2>
            </div>
            <Badge variant="default" className="text-[10px] bg-blue-500/20 text-blue-400">3 Users</Badge>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mockUsers.map((mu) => (
                  <tr key={mu.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-medium text-white">{mu.name}</p>
                      <p className="text-xs text-slate-500">{mu.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="relative inline-block w-full max-w-[120px]">
                        <select 
                          disabled={!isAdmin}
                          defaultValue={mu.role}
                          className={`w-full appearance-none bg-[#0B0F14] border border-slate-700 text-xs text-white rounded px-3 py-1.5 outline-none ${isAdmin ? 'cursor-pointer hover:border-slate-500 focus:border-blue-500' : 'opacity-70 cursor-not-allowed'}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        className="text-[9px] px-2 py-0.5"
                        variant={mu.status === 'Active' ? 'default' : 'destructive'} 
                      >
                        {mu.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}