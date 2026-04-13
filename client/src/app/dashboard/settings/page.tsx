"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, Settings, Key, Sliders, Users, ChevronDown, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appRouterContext } from "next/dist/server/route-modules/app-route/shared-modules";
import api from "@/lib/api";

type UserData = {
  id: string;
  username: string | null;
  email: string;
  role: 'ADMIN' | 'USER';
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();
  
  const [threshold, setThreshold] = useState(85);
  const [apiKey, setApiKey] = useState("sk_live_1234567890abcdef");

  const {data: dbUsers = [], isLoading} = useQuery<UserData[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: isAdmin,
    
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role}: { userId: string; role: string }) => {
      await api.patch(`/users/${userId}/role`, {role});
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData<UserData[]>(['users']);
      queryClient.setQueryData<UserData[]>(['users'], old => 
        old?.map(u => u.id === userId ? { ...u, role: role as 'ADMIN' | 'USER' } : u)
      );
      return { previousUsers };
    },
    onError: (err, newMeta, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
      alert("Failed to update role. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['users']});
    }
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    if (userId === user?.id) {
      alert("Security Protocol: You cannot change your own role directly.");
      return;
    }
    if(confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      roleMutation.mutate({userId, role: newRole});
    }
  };

  const handleSaveChanges = () => {
    alert("System configurations saved successfully!");
  };

  const handleRegenerateKey = () => {
    setApiKey("sk_live_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10));
  };
  
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
          <p className="text-sm text-slate-400">
            {user?.organization?.name ? `Managing ${user.organization.name}` : 'Configure core engine parameters and manage system access'}
          </p>
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
                <span className="text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded text-sm">{threshold}%</span>
              </div>
              <input 
                type="range" 
                min="50" max="100" 
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
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
                    type="text" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#0B0F14] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-300 text-sm outline-none"
                  />
                </div>
                <button 
                  onClick={handleRegenerateKey}
                  disabled={!isAdmin}
                  className={`px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg border border-slate-700 transition-colors ${isAdmin ? 'hover:bg-slate-700' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSaveChanges}
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
            <Badge variant="default" className="text-[10px] bg-blue-500/20 text-blue-400">{dbUsers.length} Users</Badge>
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
                {isLoading && isAdmin ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-slate-400">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : isAdmin ? (
                  dbUsers.map((mu) => (
                    <tr key={mu.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-white flex items-center gap-2">
                          {mu.username || 'Unnamed User'}
                          {mu.id === user?.id && (
                            <Badge variant="default" className="text-[9px] bg-blue-500/30 text-blue-300 border-blue-500/40">
                              Current Administrator
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{mu.email}</p>
                      </td>
                      <td className="p-4">
                        <div className="relative group inline-block w-full max-w-[140px]">
                          <select 
                            disabled={!isAdmin || mu.id === user?.id || roleMutation.isPending}
                            value={mu.role}
                            onChange={(e) => handleRoleChange(mu.id, e.target.value)}
                            className={`w-full appearance-none bg-[#0B0F14] border border-slate-700 text-xs text-white rounded px-3 py-1.5 outline-none ${isAdmin && mu.id !== user?.id ? 'cursor-pointer hover:border-slate-500 focus:border-blue-500' : 'opacity-50 cursor-not-allowed bg-slate-900/50'}`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="USER">USER</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          
                          {mu.id === user?.id && (
                            <div className="absolute -bottom-10 left-0 hidden group-hover:block z-20 whitespace-nowrap bg-slate-900 border border-slate-800 text-[9px] text-slate-400 px-2 py-1.5 rounded shadow-xl">
                              <ShieldAlert className="inline w-3 h-3 mr-1 text-yellow-500" />
                              Security Protocol: Access level locked for self-account
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          className="text-[9px] px-2 py-0.5"
                          variant='default'
                        >
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Key className="w-8 h-8 opacity-20 text-red-500" /> 
                          <p>System locked. You do not have permission to view or manage users.</p>
                        </div>
                      </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}