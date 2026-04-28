"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, Users as UsersIcon, Activity, Search, 
  ShieldCheck, AlertTriangle, Loader2, RefreshCw, 
  ChevronLeft, ChevronRight, Globe, Zap, Server, Shield
} from "lucide-react";

import api, { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn, PLAN_LABELS } from "@/lib/utils";

export default function GlobalAdminDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { isEnterprise, isSaas } = useFeatureFlags();
  const [page, setPage] = useState(1);

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["global-stats"],
    queryFn: () => api.get("/admin/stats").then(r => r.data),
    enabled: isSuperAdmin,
  });

  const { data: orgData, isLoading: orgsLoading } = useQuery({
    queryKey: ["global-orgs", page],
    queryFn: () => api.get(`/admin/organizations?page=${page}&limit=10`).then(r => r.data),
    enabled: isSuperAdmin,
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: any }) => {
      return api.patch(`/admin/organizations/${orgId}/license`, data);
    },
    onSuccess: () => {
     
      queryClient.invalidateQueries({ queryKey: ["global-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["global-stats"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (err: any) => {
      console.error(err instanceof ApiError ? err.message : "License update failed");
    }
  });

  if (!isSuperAdmin) return <AccessDeniedState />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[500px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
            {isSaas ? <Globe className="w-4 h-4" /> : <Server className="w-4 h-4" />} 
            {isSaas ? "Global Cloud Infrastructure" : "Private Enterprise Node"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            System <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Overseer</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg leading-relaxed">
            {isSaas 
              ? "Monitor multi-tenant resource allocations, user activities, and adjust compliance quotas across the public cloud."
              : "Manage internal departments, system health, and unlimited compliance operations within your secure private network."}
          </p>
        </div>
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 p-5 rounded-3xl flex items-center gap-5 shadow-xl hover:shadow-primary/5 transition-all">
          <div className="text-right">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Core Status</p>
             <p className="text-xs font-bold text-emerald-500">Systems Operational</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-10">
        <StatTile 
          icon={<Building2 className="w-6 h-6 text-indigo-500" />} 
          label={isSaas ? "Active Tenants" : "Departments"} 
          value={stats?.totalOrganizations} 
          loading={statsLoading} 
          colorClass="from-indigo-500/20 to-indigo-500/5 border-indigo-500/20"
        />
        <StatTile 
          icon={<UsersIcon className="w-6 h-6 text-blue-500" />} 
          label="Global Users" 
          value={stats?.totalUsers} 
          loading={statsLoading} 
          colorClass="from-blue-500/20 to-blue-500/5 border-blue-500/20"
        />
        <StatTile 
          icon={<Search className="w-6 h-6 text-primary" />} 
          label="Total Queries" 
          value={stats?.totalQueriesCreated} 
          loading={statsLoading} 
          colorClass="from-primary/20 to-primary/5 border-primary/20"
        />
        <StatTile 
          icon={<Activity className="w-6 h-6 text-emerald-500" />} 
          label="System Load" 
          value={stats?.totalSystemUsage} 
          loading={statsLoading} 
          colorClass="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20"
        />
      </div>

      {/* Tenants Table */}
      <section className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-transparent" />
        <div className="px-10 py-8 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
              <DatabaseIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-foreground uppercase text-sm tracking-[0.2em]">{isSaas ? "Tenant Directory" : "Department Management"}</h3>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Resource & License Control</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background border border-border/50 p-1.5 rounded-xl">
             <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2.5 hover:bg-muted text-foreground rounded-lg disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
             <span className="text-[10px] font-black px-4 uppercase tracking-[0.2em] text-muted-foreground">Page <span className="text-foreground">{page}</span> / {orgData?.meta?.pages || 1}</span>
             <button onClick={() => setPage(p => p + 1)} disabled={page >= (orgData?.meta?.pages || 1)} className="p-2.5 hover:bg-muted text-foreground rounded-lg disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-separate border-spacing-y-2 px-2">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                <th className="px-6 py-4">{isSaas ? "Organization & Identity" : "Department"}</th>
                <th className="px-6 py-4">Plan Level</th>
                <th className="px-6 py-4 text-center">Monthly Limit</th>
                <th className="px-6 py-4 text-center">Enterprise Mode</th>
                <th className="px-6 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody>
              {orgsLoading ? (
                <LoadingTableRows />
              ) : orgData?.items.map((org: any) => (
                <tr key={org.id} className="bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl">
                  <td className="px-6 py-5 rounded-l-2xl">
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{org.name}</div>
                    <div className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-[0.1em]">ID: {org.id.slice(0,12)}...</div>
                  </td>
                  <td className="px-6 py-5">
                    <select
                      className="bg-card border border-border/50 shadow-sm rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all cursor-pointer appearance-none"
                      value={org.plan}
                      onChange={(e) => updateLicenseMutation.mutate({ orgId: org.id, data: { plan: e.target.value } })}
                    >
                      {Object.keys(PLAN_LABELS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <input
                      type="number"
                      className="w-28 bg-card border border-border/50 shadow-sm rounded-xl px-4 py-2.5 text-xs font-mono font-black text-center outline-none focus:border-primary transition-all disabled:opacity-30"
                      defaultValue={org.queriesLimit}
                      disabled={org.isUnlimited || org.queriesLimit === -1}
                      onBlur={(e) => updateLicenseMutation.mutate({ orgId: org.id, data: { queriesLimit: parseInt(e.target.value) } })}
                    />
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={org.isUnlimited || org.queriesLimit === -1}
                          onChange={(e) => updateLicenseMutation.mutate({ orgId: org.id, data: { isUnlimited: e.target.checked } })}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right rounded-r-2xl">
                    <button 
                      onClick={() => updateLicenseMutation.mutate({ orgId: org.id, data: { queriesUsed: 0 } })}
                      disabled={updateLicenseMutation.isPending}
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase bg-secondary text-secondary-foreground px-5 py-2.5 rounded-xl border border-border/50 hover:bg-muted hover:shadow-md transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3 h-3", updateLicenseMutation.isPending && "animate-spin")} /> Reset Usage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --- Sub Components ---

function StatTile({ icon, label, value, loading, colorClass }: any) {
  return (
    <div className="bg-card/50 backdrop-blur-xl p-8 rounded-[2rem] border border-border/50 shadow-sm flex items-start gap-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-inner relative z-10 border", colorClass)}>
        {icon}
      </div>
      <div className="relative z-10 flex-1 pt-1">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-muted/50 animate-pulse rounded-xl" />
        ) : (
          <h3 className="text-3xl font-black tracking-tighter leading-none">{value?.toLocaleString() || 0}</h3>
        )}
      </div>
    </div>
  );
}

function AccessDeniedState() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-12">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
        <div className="w-24 h-24 bg-card border border-destructive/30 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
          <Shield className="w-10 h-10 text-destructive" />
        </div>
      </div>
      <h2 className="text-4xl font-black tracking-tighter italic">Access <span className="text-destructive not-italic">Restricted</span></h2>
      <p className="text-muted-foreground text-sm mt-3 max-w-sm font-medium leading-relaxed">
        This command center is secured. Only users with the <span className="font-bold text-foreground">SUPER_ADMIN</span> clearance can access global infrastructure settings.
      </p>
    </div>
  );
}

function LoadingTableRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse bg-background/20">
      <td colSpan={5} className="px-6 py-6 rounded-2xl"><div className="h-12 bg-muted/50 rounded-xl w-full" /></td>
    </tr>
  ));
}

function DatabaseIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
}