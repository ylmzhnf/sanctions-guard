"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  Database, RefreshCw, Server, Activity, 
  CheckCircle2, AlertCircle, Clock, ShieldAlert 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

export default function DataSyncPage() {
  const queryClient = useQueryClient();
  const [syncMessage, setSyncMessage] = useState("");

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const res = await api.get("/admin/sanctions-sync/status");
      return res.data;
    },
    refetchInterval: 10000, 
  });

  const { data: logsData = [], isLoading: logsLoading } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const res = await api.get("/admin/sanctions-sync/logs");
      return res.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/admin/sanctions-sync/trigger");
      return res.data;
    },
    onSuccess: () => {
      setSyncMessage("Sync process started in the background! Logs will update shortly.");
      setTimeout(() => setSyncMessage(""), 5000);
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
    onError: () => {
      setSyncMessage("Failed to trigger sync. Check console.");
      setTimeout(() => setSyncMessage(""), 5000);
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card p-8 rounded-3xl border border-border shadow-xl">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sanctions Database</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Manage and synchronize your local database with official global watchlists (OFAC, EU, UN, UK HMT).
            </p>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-primary text-primary-foreground hover:opacity-90 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <RefreshCw className={clsx("w-5 h-5", syncMutation.isPending && "animate-spin")} />
            {syncMutation.isPending ? "Starting Sync..." : "Force Live Sync Now"}
          </button>
          {syncMessage && (
            <span className="text-xs font-bold text-emerald-500 mt-2 animate-in fade-in">
              {syncMessage}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-md">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
            <Server className="w-3 h-3" /> Total Entities
          </p>
          <h3 className="text-3xl font-black text-foreground">
            {statusLoading ? "..." : statusData?.total?.toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">Entities processed all-time</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-md border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" /> Active Watchlist
          </p>
          <h3 className="text-3xl font-black text-emerald-500">
            {statusLoading ? "..." : statusData?.active?.toLocaleString()}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">Currently active in fuzzy-search</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-md flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">
            Source Breakdown
          </p>
          <div className="space-y-3">
            {statusLoading ? (
              <span className="text-sm text-muted-foreground">Loading sources...</span>
            ) : statusData?.bySource?.length === 0 ? (
               <span className="text-sm text-muted-foreground italic">No data yet</span>
            ) : (
              statusData?.bySource?.map((source: any) => (
                <div key={source.listSource} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
                    {source.listSource}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {source._count.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/20">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Synchronization History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              <tr className="border-b border-border">
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Added</th>
                <th className="px-6 py-4 text-center">Updated</th>
                <th className="px-6 py-4 text-center">Removed</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logsLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading logs...</td>
                </tr>
              ) : logsData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">No sync logs found.</td>
                </tr>
              ) : (
                logsData.map((log: any) => (
                  <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm text-foreground">
                      {log.source}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "SUCCESS" ? (
                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="critical" title={log.error}>
                          <ShieldAlert className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-emerald-500">
                      +{log.recordsAdded}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-blue-500">
                      ~{log.recordsUpdated}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-destructive">
                      -{log.recordsRemoved}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                      {new Date(log.syncedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}