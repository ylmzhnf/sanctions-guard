"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Server, Activity, CheckCircle2, Clock, ShieldAlert, Loader2, Info, ArrowRight, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

export default function DataSyncPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => (await api.get("/admin/sanctions-sync/status")).data,
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  const { data: logsData = [], isLoading: logsLoading } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => (await api.get("/admin/sanctions-sync/logs")).data,
    enabled: isAdmin,
  });

  const syncMutation = useMutation({
    mutationFn: async () => (await api.post("/admin/sanctions-sync/trigger")).data,
    onSuccess: (data) => {
      setSyncStatus({ text: data.message || "Sync Protocol Initiated", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      setTimeout(() => setSyncStatus({ text: "", type: null }), 6000);
    },
    onError: (err: any) => {
      setSyncStatus({ text: err.response?.data?.message || "Sync Protocol Failed.", type: "error" });
      setTimeout(() => setSyncStatus({ text: "", type: null }), 6000);
    }
  });

  if (!isAdmin) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-12">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
        <div className="w-24 h-24 bg-card border border-destructive/30 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
      </div>
      <h2 className="text-4xl font-black tracking-tighter italic">Access <span className="text-destructive not-italic">Restricted</span></h2>
      <p className="text-muted-foreground text-sm mt-3 max-w-sm font-medium leading-relaxed">
        This system module requires <span className="font-bold text-foreground">ADMIN</span> clearance.
      </p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[500px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl p-10 rounded-[3rem] border border-border/50 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-3xl rounded-full" />

        <div className="flex items-start gap-6 relative z-10 w-full lg:w-auto">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-5 rounded-3xl border border-primary/20 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-700">
            <Database className="w-10 h-10 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-2">
              <Server className="w-4 h-4" /> Database Sync
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
              Sanctions<span className="text-primary not-italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500"> Engine</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg leading-relaxed">
              Real-time synchronization matrix for global watchlists including OFAC, EU, and UN databases.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-auto relative z-10 flex flex-col items-center lg:items-end gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || statusData?.isRunning}
            className={cn(
              "w-full lg:w-auto px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl",
              (syncMutation.isPending || statusData?.isRunning) 
                ? "bg-secondary/50 text-muted-foreground cursor-not-allowed border border-border/50 backdrop-blur-md" 
                : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 shadow-primary/20 hover:shadow-[0_0_30px_rgba(var(--primary),0.3)]"
            )}
          >
            <RefreshCw className={cn("w-5 h-5", (syncMutation.isPending || statusData?.isRunning) && "animate-spin")} />
            {statusData?.isRunning ? "Sync in Progress..." : "Force Sync Now"}
          </button>
          
          {syncStatus.text && (
            <div className={cn(
              "text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
              syncStatus.type === "success" ? "text-emerald-500" : "text-destructive"
            )}>
              {syncStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {syncStatus.text}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {[
          { label: "Total Indexed Records", value: statusData?.total, icon: Server, color: "text-foreground", border: "hover:border-border" },
          { label: "Active Enforcement", value: statusData?.active, icon: Activity, color: "text-emerald-500", border: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]" },
        ].map((stat, i) => (
          <div key={i} className={cn("bg-card/60 backdrop-blur-xl p-8 rounded-[2rem] border border-border/50 shadow-sm transition-all duration-500 relative overflow-hidden group", stat.border)}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-xl bg-background shadow-inner border border-border/50">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div> 
              {stat.label}
            </div>
            <h3 className={cn("text-5xl font-black tracking-tighter relative z-10", stat.color)}>
              {statusLoading ? (
                <div className="h-12 w-32 bg-muted/50 animate-pulse rounded-xl" />
              ) : (
                (stat.value || 0).toLocaleString()
              )}
            </h3>
          </div>
        ))}

        <div className="bg-card/60 backdrop-blur-xl p-8 rounded-[2rem] border border-border/50 shadow-sm transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-xl bg-background shadow-inner border border-border/50">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            Source Distribution
          </div>
          <div className="space-y-3 relative z-10">
            {statusLoading ? (
              <div className="space-y-2">
                 <div className="h-6 w-full bg-muted/50 animate-pulse rounded-md" />
                 <div className="h-6 w-full bg-muted/50 animate-pulse rounded-md" />
              </div>
            ) : statusData?.bySource?.length === 0 ? (
               <p className="text-xs font-bold text-muted-foreground">No data indexed.</p>
            ) : (
              statusData?.bySource?.map((s: any) => (
                <div key={s.listSource} className="flex justify-between items-center text-[11px] font-black">
                  <span className="bg-background px-3 py-1.5 rounded-lg border border-border/50 uppercase tracking-widest shadow-sm text-foreground">{s.listSource}</span>
                  <span className="font-mono text-muted-foreground">{s._count.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── LOGS TABLE ────────────────────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
        <div className="p-8 border-b border-border/50 bg-muted/10 flex items-center gap-4">
          <div className="p-2.5 bg-background rounded-xl border border-border/50 shadow-inner">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">System Synchronization Logs</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-separate border-spacing-y-2 px-2">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                <th className="px-6 py-4">Data Source</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4 text-center">Injected</th>
                <th className="px-6 py-4 text-center">Purged</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold">
              {logsLoading ? (
                 <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></td></tr>
              ) : logsData.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-muted-foreground font-black text-[10px] uppercase tracking-widest">No sync logs found.</td></tr>
              ) : logsData.map((log: any) => (
                <tr key={log.id} className="bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl">
                  <td className="px-6 py-5 rounded-l-2xl">
                    <span className="bg-card border border-border/50 shadow-sm px-3 py-1.5 rounded-lg text-[10px] tracking-widest uppercase text-foreground">{log.source}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-4 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black shadow-sm",
                      log.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-emerald-500 font-mono text-sm group-hover:scale-110 transition-transform">+{log.recordsAdded}</td>
                  <td className="px-6 py-5 text-center text-destructive font-mono text-sm group-hover:scale-110 transition-transform">-{log.recordsRemoved}</td>
                  <td className="px-6 py-5 text-right text-muted-foreground font-medium rounded-r-2xl tracking-widest uppercase text-[10px]">{formatDate(log.syncedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}