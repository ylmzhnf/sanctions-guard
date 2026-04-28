"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Lock, Loader2, ShieldCheck, ShieldAlert, 
  ChevronLeft, ChevronRight, Fingerprint, Search
} from "lucide-react";

import api from "@/lib/api";
import { Badge } from "@/components/ui/badge"; 
import { formatDate, cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  metadata?: any;
  integrityHash: string;
  createdAt: string;
  user?: { email: string; name?: string; } | null;
  query?: { queryName: string; riskLevel: string; } | null;
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["audit-logs", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(debouncedSearch && { search: debouncedSearch })
      });
      const response = await api.get(`/audit/logs?${params}`);
      return {
        logs: (response.data?.data || response.data?.logs || []) as AuditLog[],
        meta: response.data?.meta || { total: 0, page: 1, pages: 1 },
      };
    },
    placeholderData: (prev) => prev,
  });

  const auditLogs = data?.logs || [];
  const meta = data?.meta || { total: 0, page: 1, pages: 1 };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      const res = await api.get(`/audit/verify/${id}`);
      setVerifyResult((prev) => ({ ...prev, [id]: res.data.valid ?? res.data.isValid }));
    } catch {
      setVerifyResult((prev) => ({ ...prev, [id]: false }));
    } finally {
      setVerifying(null);
    }
  };

  const getActionStyle = (action: string) => {
    if (action.includes("SCREEN")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (action.includes("USER") || action.includes("AUTH")) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (action.includes("SYNC") || action.includes("ADMIN")) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-muted/50 text-muted-foreground border-border/50";
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">

      <div className="absolute top-0 left-20 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-[500px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-700">
          <Lock className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-[0.3em] mb-3 justify-center md:justify-start">
            <ShieldCheck className="w-4 h-4" /> Cryptographic Integrity Vault
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Immutable <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-primary">Audit Logs</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 leading-relaxed max-w-2xl">
            Every system event is cryptographically sealed with{" "}
            <strong className="text-foreground font-black">HMAC-SHA256</strong>. These records are immutable, tamper-evident, and independently verifiable for regulatory compliance.
          </p>
        </div>
        <div className="ml-auto flex-shrink-0 relative z-10">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Integrity Active</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-center relative z-10">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search by action, query name, or actor..."
            className="w-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isFetching && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground bg-card/60 backdrop-blur-xl border border-border/50 px-5 py-4 rounded-2xl shadow-sm">
            {meta.total?.toLocaleString() || 0} Records
          </div>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-primary to-transparent" />
        
        <div className="overflow-x-auto min-h-[500px] p-4">
          {isLoading && auditLogs.length === 0 ? (
            <div className="h-[500px] flex flex-col justify-center items-center space-y-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Loading Vault...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="h-[500px] flex flex-col items-center justify-center">
              <div className="bg-primary/5 p-8 rounded-full border border-primary/10 shadow-inner mb-6">
                <Fingerprint className="w-16 h-16 text-primary opacity-50" />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.3em] text-muted-foreground">No Audit Records Found</p>
              <button onClick={() => setSearchTerm("")} className="text-[10px] text-primary mt-4 font-black uppercase tracking-widest hover:underline underline-offset-4">
                Clear Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-2 px-2">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                  <th className="px-6 py-4">Event / Action</th>
                  <th className="px-6 py-4">Context</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const qName = log.metadata?.queryName || log.query?.queryName;
                  const rLevel = log.metadata?.riskLevel || log.query?.riskLevel;

                  return (
                    <tr key={log.id} className="bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl">
                      <td className="px-6 py-5 rounded-l-2xl">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-xl border shadow-sm",
                          getActionStyle(log.action)
                        )}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {qName ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground tracking-tight italic opacity-90 group-hover:text-primary transition-colors truncate max-w-[200px]">
                              &ldquo;{qName}&rdquo;
                            </span>
                            {rLevel && (
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                                ["CRITICAL", "HIGH"].includes(rLevel) 
                                  ? "bg-destructive/10 text-destructive border-destructive/20" 
                                  : "bg-muted text-muted-foreground border-border/50"
                              )}>
                                {rLevel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">System Event</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] font-black border border-primary/20 text-primary uppercase group-hover:scale-110 transition-transform">
                            {log.user?.email?.[0] || "S"}
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{log.user?.email || "System Engine"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-[10px] font-bold text-muted-foreground bg-background/50 px-4 py-2.5 rounded-xl border border-border/50 inline-block uppercase tracking-widest shadow-sm">
                          {formatDate(log.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-right rounded-r-2xl">
                        {verifyResult[log.id] !== undefined ? (
                          <div className={cn(
                            "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2.5 rounded-xl border shadow-sm animate-in zoom-in-95",
                            verifyResult[log.id] 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}>
                            {verifyResult[log.id] ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            {verifyResult[log.id] ? "Verified" : "Tampered!"}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-muted-foreground/30 font-mono text-[9px] hidden xl:inline tracking-tighter" title={log.integrityHash}>
                              {log.integrityHash.slice(0, 16)}...
                            </span>
                            <button
                              onClick={() => handleVerify(log.id)}
                              disabled={verifying === log.id}
                              className="text-[10px] font-black text-primary hover:text-primary/70 disabled:opacity-30 transition-all uppercase tracking-[0.2em] bg-primary/10 hover:bg-primary/20 px-4 py-2.5 rounded-xl border border-primary/20 shadow-sm"
                            >
                              {verifying === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Hash"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {meta.pages > 1 && (
          <div className="px-8 py-6 border-t border-border/50 bg-muted/10 flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
              Page <span className="text-foreground">{page}</span> / {meta.pages}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-2 bg-card border border-border/50 text-foreground hover:bg-muted disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.2em] py-3.5 px-6 rounded-xl transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-2 bg-card border border-border/50 text-foreground hover:bg-muted disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.2em] py-3.5 px-6 rounded-xl transition-all shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}