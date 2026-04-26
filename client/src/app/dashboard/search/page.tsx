"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  BrainCircuit,
  Lock,
  AlertCircle,
  Info,
  Loader2,
  Filter,
  CheckCircle2,
  ShieldAlert,
  Download,
  Newspaper,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api"; 
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

const SOURCE_LABELS: Record<string, string> = {
  OFAC: "OFAC (US)",
  EU: "EU Consolidated",
  UN: "UN Security Council",
  UK_HMT: "UK HMT",
  OTHER: "Other Watchlist",
};

const formatScore = (score: number | string) => {
  const num = typeof score === "string" ? parseFloat(score) : score;
  return `${Math.round(num)}%`;
};

type ScreeningResult = {
  success: boolean;
  count: number;
  queryId?: string;
  riskLevel: string;
  aiExplanation?: string;
  data: Array<{
    id: string;
    matchedName: string;
    score: number;
    listSource: string;
    matchedField: string;
  }>;
  osintResults?: {
    news: Array<{ title: string; link: string; source: string; date: string }>;
    social: Array<{ title: string; link: string; platform: string }>;
  };
};

type ErrorState = {
  message: string;
  type: "LIMIT" | "GENERAL";
} | null;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(searchParams.get("name") || "");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    const urlName = searchParams.get("name");
    if (urlName && !searchMutation.data && !searchMutation.isPending) {
      searchMutation.mutate({ name: urlName, type: "" });
    }
  }, []);

  const searchMutation = useMutation({
    mutationFn: async (params: { name: string; type: string }) => {
      const response = await api.post("/screening/screen", {
        queryName: params.name,
        entityType: params.type || undefined,
      });
      return response.data as ScreeningResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user-status"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-logs"] });
      queryClient.invalidateQueries({ queryKey: ["org-status"] });
    },
    onError: (err: any) => {
      if (err.response?.status === 403) {
        setError({
          message: "You have reached your screening limit. Please upgrade your plan.",
          type: "LIMIT",
        });
      } else {
        setError({
          message: err.response?.data?.message || "Screening failed. Please try again.",
          type: "GENERAL",
        });
      }
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    window.history.replaceState(null, "", `?name=${encodeURIComponent(name.trim())}`);
    searchMutation.mutate({ name: name.trim(), type: entityType });
  };

  const handleDownloadReport = async (queryId: string) => {
    try {
      const response = await api.get(`/screening/download-report/${queryId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `screening-report-${queryId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const isSearching = searchMutation.isPending;
  const result = searchMutation.data;

  const getRiskConfig = (risk: string) => {
    const level = risk?.toUpperCase();
    if (["CRITICAL", "EXACT MATCH", "HIGH"].includes(level))
      return {
        color: "text-destructive",
        variant: "destructive",
        bg: "bg-destructive/10 border-destructive/30",
      };
    if (level === "MEDIUM")
      return {
        color: "text-amber-500",
        variant: "warning",
        bg: "bg-amber-500/10 border-amber-500/30",
      };
    if (level === "LOW")
      return {
        color: "text-blue-500",
        variant: "secondary",
        bg: "bg-blue-500/10 border-blue-500/30",
      };
    return {
      color: "text-emerald-500",
      variant: "outline",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    };
  };

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-primary font-medium leading-relaxed">
          <strong>Pro-Tip:</strong> Screening engine uses fuzzy matching. For
          better results, use full legal names or vessel IMO numbers. All
          queries are HMAC-signed for audit integrity.
        </p>
      </div>

      <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-[2]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="e.g. Abramovich, Rusal, MV Arctic Sea..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSearching}
                required
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                disabled={isSearching}
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-4 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Any Type</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ENTITY">Company / Organisation</option>
                <option value="VESSEL">Vessel</option>
                <option value="AIRCRAFT">Aircraft</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md min-w-[160px]"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {isSearching ? "Screening..." : "Screen Now"}
            </button>
          </div>
        </form>

        {error && (
          <div
            className={clsx(
              "mt-6 rounded-2xl border p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2",
              error.type === "LIMIT" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              {error.type === "LIMIT" ? <ShieldAlert className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-semibold">{error.message}</p>
            </div>
            {error.type === "LIMIT" && (
              <button
                onClick={() => router.push("/dashboard/billing")}
                className="bg-destructive text-white px-6 py-2 rounded-lg font-bold text-xs shadow-md hover:opacity-90 transition-all whitespace-nowrap"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}
      </div>

      {result && riskConfig && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {result.riskLevel === "CLEAR" || result.count === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-lg relative">
              <div className="bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Sanctions Matches</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                No records were found for <strong>"{name}"</strong> across international watchlists.
              </p>
              
              {result.queryId && (
                <button
                  onClick={() => handleDownloadReport(result.queryId!)}
                  className="mx-auto flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  <Download className="w-4 h-4" /> Download Clear Report
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={clsx("rounded-3xl p-6 border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl", riskConfig.bg)}>
                <div className="flex items-center gap-4">
                  <div className={clsx("w-3 h-3 rounded-full animate-pulse shadow-[0_0_12px]", `bg-${riskConfig.color.split("-")[1]}-500`)} />
                  <div>
                    <h3 className="font-bold text-foreground text-xl">Potential Match Detected</h3>
                    <p className="text-sm text-muted-foreground">Found {result.count} records matching your query.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {result.queryId && (
                     <button
                        onClick={() => handleDownloadReport(result.queryId!)}
                        className="flex items-center gap-2 bg-background border border-border hover:bg-secondary/50 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                      >
                       <Download className="w-4 h-4" /> PDF Report
                     </button>
                  )}
                  <Badge variant={riskConfig.variant as any} className="px-6 py-2 uppercase text-xs font-black tracking-widest shadow-md">
                    {result.riskLevel} RISK
                  </Badge>
                </div>
              </div>

              {result.aiExplanation && (
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-border bg-primary/5 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-foreground text-xs uppercase tracking-widest">AI Contextual Analysis</h2>
                  </div>
                  <div className="p-8">
                    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap italic">
                      "{result.aiExplanation}"
                    </p>
                  </div>
                </div>
              )}

              {result.osintResults && (result.osintResults.news?.length > 0 || result.osintResults.social?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
                    <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-blue-500" /> Recent News
                    </h2>
                    <div className="space-y-4">
                      {result.osintResults.news.slice(0, 3).map((item, i) => (
                        <div key={i} className="group">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline line-clamp-2">
                            {item.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">{item.source}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
                    <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-500" /> Social & Web
                    </h2>
                    <div className="space-y-4">
                      {result.osintResults.social.slice(0, 3).map((item, i) => (
                        <div key={i} className="group">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline line-clamp-2">
                            {item.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="bg-secondary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{item.platform}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result.data && result.data.length > 0 && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <h2 className="font-bold text-foreground">Match Details ({result.count})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        <tr className="border-b border-border">
                          <th className="px-6 py-4">Matched Name</th>
                          <th className="px-6 py-4 text-center">Similarity</th>
                          <th className="px-6 py-4">List Source</th>
                          <th className="px-6 py-4">Matched Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.data.map((m) => {
                          const scoreNum = typeof m.score === "string" ? parseFloat(m.score) : m.score;
                          const isHighMatch = scoreNum >= 85;

                          return (
                            <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-foreground text-sm">{m.matchedName}</td>
                              <td className="px-6 py-4 text-center">
                                <Badge variant={isHighMatch ? "destructive" : "secondary"} className="font-mono text-xs shadow-sm">
                                  {formatScore(m.score)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-secondary text-secondary-foreground text-[10px] px-2.5 py-1 rounded-md font-bold border border-border uppercase">
                                  {SOURCE_LABELS[m.listSource] || m.listSource}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground text-xs capitalize">{m.matchedField?.toLowerCase() || "Name"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SearchContent />
    </Suspense>
  );
}