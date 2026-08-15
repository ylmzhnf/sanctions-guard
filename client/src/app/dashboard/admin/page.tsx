"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, Users as UsersIcon, Search, 
  ChevronLeft, ChevronRight, Server
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isSuperAdmin } from "@/lib/auth-utils";
import { SuperAdminGuard, AccessDenied } from "@/components/RoleGuard";

export default function GlobalAdminDashboard() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);

  const userIsSuperAdmin = isSuperAdmin(user);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["global-stats"],
    queryFn: () => api.get("/admin/stats").then(r => r.data),
    enabled: userIsSuperAdmin,
  });

  const { data: orgData, isLoading: orgsLoading } = useQuery({
    queryKey: ["global-orgs", page],
    queryFn: () => api.get(`/admin/organizations?page=${page}&limit=10`).then(r => r.data),
    enabled: userIsSuperAdmin,
  });

  if (!userIsSuperAdmin) return <AccessDenied requiredRole="SUPER_ADMIN" />;

  return (
    <SuperAdminGuard>
      <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[500px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
            <Server className="w-4 h-4" /> SanctionsGuard MVP Core
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            System <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Overseer</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg leading-relaxed">
            Monitor organizations, user accounts, and overall system activity.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 relative z-10">
        <StatTile 
          icon={<Building2 className="w-6 h-6 text-indigo-500" />} 
          label="Organizations" 
          value={stats?.totalOrganizations} 
          loading={statsLoading} 
          colorClass="from-indigo-500/20 to-indigo-500/5 border-indigo-500/20"
        />
        <StatTile 
          icon={<UsersIcon className="w-6 h-6 text-blue-500" />} 
          label="Total Users" 
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
      </div>

      {/* Organizations Table */}
      <section className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-transparent" />
        <div className="px-10 py-8 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
              <DatabaseIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-foreground uppercase text-sm tracking-[0.2em]">Organizations Directory</h3>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1 font-mono">System Tenants</p>
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
                <th className="px-6 py-4">Organization Name</th>
                <th className="px-6 py-4 text-center">Users</th>
                <th className="px-6 py-4 text-center">Queries</th>
                <th className="px-6 py-4 text-right font-mono">ID</th>
              </tr>
            </thead>
            <tbody>
              {orgsLoading ? (
                <LoadingTableRows />
              ) : orgData?.items.map((org: any) => (
                <tr key={org.id} className="bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl">
                  <td className="px-6 py-5 rounded-l-2xl">
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{org.name}</div>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-sm">
                    {org._count?.users || 0}
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-sm">
                    {org._count?.queries || 0}
                  </td>
                  <td className="px-6 py-5 text-right rounded-r-2xl font-mono text-xs text-muted-foreground">
                    {org.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </SuperAdminGuard>
  );
}

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

function LoadingTableRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse bg-background/20">
      <td colSpan={4} className="px-6 py-6 rounded-2xl"><div className="h-12 bg-muted/50 rounded-xl w-full" /></td>
    </tr>
  ));
}

function DatabaseIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
}