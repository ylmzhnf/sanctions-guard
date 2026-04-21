"use client";

import { useState } from "react";
import { Lock, Loader2, AlertCircle, Info, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  metadata?: {
    queryName?: string;
    riskLevel?: string;
    matchedCount?: number;
    [key: string]: any;
  };
  integrityHash: string;
  createdAt: string;
  user?: {
    email: string;
    name?: string;
  } | null;
  query?: {
    queryName: string;
    riskLevel: string;
    status: string;
  } | null;
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const response = await api.get(`/audit/logs?page=${page}&limit=10`);
      if (response.data && response.data.success) {
        return {
          logs: response.data.data as AuditLog[],
          meta: response.data.meta, 
        };
      }
      return { logs: [], meta: { total: 0, page: 1, pages: 1 } };
    },
  });

  const auditLogs = data?.logs || [];
  const meta = data?.meta || { total: 0, page: 1, pages: 1 };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      const res = await api.get(`/audit/verify/${id}`);
      setVerifyResult((prev) => ({ ...prev, [id]: res.data.isValid }));
    } catch {
      setVerifyResult((prev) => ({ ...prev, [id]: false }));
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary text-sm">Audit Trail</p>
          <p className="text-muted-foreground text-xs mt-1">
            Immutable, HMAC-signed record of all screening activity. {meta.total} total entries securely stored.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
          <div>
            <h3 className="font-bold text-foreground text-lg tracking-tight">
              Immutable Audit Trail
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
              Every entry is cryptographically signed and cannot be altered.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 font-bold text-xs shadow-sm">
            <Lock className="w-4 h-4" /> Tamper-Proof
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="h-full flex flex-col justify-center items-center text-primary pt-24">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <span className="font-bold text-sm uppercase tracking-wider">
                Loading records...
              </span>
            </div>
          ) : isError ? (
            <div className="h-full flex flex-col justify-center items-center text-destructive pt-24">
              <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
              <span className="font-bold text-sm">
                Unable to load audit logs.
              </span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-muted-foreground font-medium italic pt-24">
              No audit records available. Run a scan to generate logs.
            </div>
          ) : auditLogs.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                <tr className="border-b border-border">
                  <th className="px-6 py-4">Entry ID</th>
                  <th className="px-6 py-4">Action / Details</th>
                  <th className="px-6 py-4">Queried By</th>
                  <th className="px-6 py-4">Integrity</th>
                  <th className="px-6 py-4 text-right">Timestamp</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log: AuditLog) => {
                  const searchTerm = log.metadata?.queryName || log.query?.queryName;
                  const riskLevel = log.metadata?.riskLevel || log.query?.riskLevel;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-secondary/30 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        #{log.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-primary font-bold uppercase mb-1 tracking-wider bg-primary/10 w-fit px-2 py-0.5 rounded">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          {searchTerm ? (
                            <span className="text-sm text-foreground">
                              Screened <strong className="italic">&ldquo;{searchTerm}&rdquo;</strong>
                              {riskLevel && (
                                <Badge
                                  variant={
                                    riskLevel === "CRITICAL" || riskLevel === "HIGH" ? "critical" : riskLevel === "MEDIUM" ? "warning" : "default"
                                  }
                                  className="uppercase text-[9px] h-4 ml-2"
                                >
                                  {riskLevel}
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                              {JSON.stringify(log.metadata)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs font-medium">
                        {log.user?.email || "System"}
                      </td>
                      <td className="px-6 py-4">
                        {verifyResult[log.id] !== undefined ? (
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${verifyResult[log.id] ? 'text-emerald-500' : 'text-destructive'}`}>
                            {verifyResult[log.id] ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            {verifyResult[log.id] ? 'VALID' : 'TAMPERED'}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 font-mono text-xs truncate max-w-[120px] block" title={log.integrityHash}>
                            {log.integrityHash.slice(0, 12)}…
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground text-right">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleVerify(log.id)}
                          disabled={verifying === log.id}
                          className="text-xs font-bold text-primary hover:underline disabled:opacity-50 transition-all"
                        >
                          {verifying === log.id ? "Verifying..." : "Verify"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        {meta.pages > 1 && (
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{meta.pages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40 text-xs font-bold py-2 px-4 rounded-lg transition-colors border border-border"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40 text-xs font-bold py-2 px-4 rounded-lg transition-colors border border-border"
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