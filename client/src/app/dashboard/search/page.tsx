"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  BrainCircuit,
  AlertCircle,
  Info,
  Loader2,
  Filter,
  CheckCircle2,
  ShieldAlert,
  Download,
  Newspaper,
  Globe,
  FileSpreadsheet,
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
  return `${(num * 100).toFixed(1)}%`;
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

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(searchParams.get("name") || "");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["recent-screenings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-logs"] });
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || "Screening failed. Please try again.",
      );
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    window.history.replaceState(
      null,
      "",
      `?name=${encodeURIComponent(name.trim())}`,
    );
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
        color: "text-red-500",
        variant: "critical",
        bg: "bg-red-500/10 border-red-500/30",
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
        variant: "outline",
        bg: "bg-blue-500/10 border-blue-500/30",
      };
    return {
      color: "text-emerald-500",
      variant: "clear",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    };
  };

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-700 leading-relaxed">
          Fuzzy matching is enabled. Prefer full legal names or vessel IMO
          numbers. Queries are HMAC-signed for audit integrity.
        </p>
      </div>

      <div className="bg-card p-4 sm:p-6 rounded-lg border border-border shadow-sm">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap lg:flex-nowrap">
            <div className="relative flex-1 min-w-0 md:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="e.g. Abramovich, Rusal, MV Arctic Sea…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSearching}
                required
                className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="relative w-full md:w-[180px] shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                disabled={isSearching}
                className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isSearching ? "Screening…" : "Screen"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/search/bulk")}
              disabled={isSearching}
              className="bg-secondary text-secondary-foreground hover:bg-muted border border-border px-4 py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Batch
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border p-4 flex items-center gap-3 bg-destructive/10 border-destructive/20 text-destructive animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
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
              <h2 className="text-2xl font-bold text-foreground mb-2">
                No Sanctions Matches
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                No records were found for <strong>"{name}"</strong> across
                international watchlists.
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
              <div
                className={clsx(
                  "rounded-lg p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm",
                  riskConfig.bg,
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldAlert
                    className={clsx("w-5 h-5 shrink-0", riskConfig.color)}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-base">
                      Potential match detected
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Found {result.count} records matching your query.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {result.queryId && (
                    <button
                      onClick={() => handleDownloadReport(result.queryId!)}
                      className="flex items-center gap-2 bg-background border border-border hover:bg-slate-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" /> PDF Report
                    </button>
                  )}
                  <Badge
                    variant={riskConfig.variant as any}
                    className="px-3 py-1.5 uppercase text-xs font-semibold tracking-wide"
                  >
                    {result.riskLevel} RISK
                  </Badge>
                </div>
              </div>

              {result.aiExplanation && (
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                  <div className="p-5 border-b border-border bg-primary/5 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-foreground text-xs uppercase tracking-widest">
                      AI Contextual Analysis
                    </h2>
                  </div>
                  <div className="p-6 md:p-8">
                    {(() => {
                      let parsedAiData = null;
                      try {
                        if (result.aiExplanation.trim().startsWith("{")) {
                          parsedAiData = JSON.parse(result.aiExplanation);
                        }
                      } catch (e) {
                        console.error(
                          "Failed to parse AI explanation JSON:",
                          e,
                        );
                      }

                      if (parsedAiData) {
                        return (
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[13px] font-bold text-foreground mb-1.5 uppercase tracking-wide opacity-80">
                                Risk Summary
                              </h4>
                              <p className="text-foreground/90 text-sm leading-relaxed">
                                {parsedAiData.summary}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-foreground mb-1.5 uppercase tracking-wide opacity-80">
                                Match Analysis
                              </h4>
                              <p className="text-foreground/90 text-sm leading-relaxed">
                                {parsedAiData.analysis}
                              </p>
                            </div>
                            <div className="bg-destructive/10 p-4 md:p-5 rounded-2xl border border-destructive/20">
                              <h4 className="text-[13px] font-bold text-destructive mb-1.5 uppercase tracking-wide">
                                Recommended Action
                              </h4>
                              <p className="text-destructive/90 text-sm leading-relaxed font-medium">
                                {parsedAiData.action}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap italic">
                          "{result.aiExplanation}"
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}

              {result.osintResults &&
                (result.osintResults.news?.length > 0 ||
                  result.osintResults.social?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.osintResults.news?.length > 0 && (
                      <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
                        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <Newspaper className="w-5 h-5 text-blue-500" /> Recent
                          News
                        </h2>
                        <div className="space-y-4">
                          {result.osintResults.news
                            .slice(0, 3)
                            .map((item, i) => (
                              <div key={i} className="group">
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:underline line-clamp-2"
                                >
                                  {item.title}
                                </a>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span className="font-medium">
                                    {item.source}
                                  </span>
                                  <span>•</span>
                                  <span>{item.date}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {result.osintResults.social?.length > 0 && (
                      <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
                        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                          <Globe className="w-5 h-5 text-purple-500" /> Social &
                          Web
                        </h2>
                        <div className="space-y-4">
                          {result.osintResults.social
                            .slice(0, 3)
                            .map((item, i) => (
                              <div key={i} className="group">
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:underline line-clamp-2"
                                >
                                  {item.title}
                                </a>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span className="bg-secondary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                    {item.platform}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {result.data && result.data.length > 0 && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <h2 className="font-bold text-foreground">
                      Match Details ({result.count})
                    </h2>
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
                          const scoreNum =
                            typeof m.score === "string"
                              ? parseFloat(m.score)
                              : m.score;
                          const isHighMatch = scoreNum >= 0.85;

                          return (
                            <tr
                              key={m.id}
                              className="hover:bg-secondary/30 transition-colors"
                            >
                              <td className="px-6 py-4 font-bold text-foreground text-sm">
                                {m.matchedName}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge
                                  variant={isHighMatch ? "critical" : "outline"}
                                  className="font-mono text-xs shadow-sm"
                                >
                                  {formatScore(m.score)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-secondary text-secondary-foreground text-[10px] px-2.5 py-1 rounded-md font-bold border border-border uppercase">
                                  {SOURCE_LABELS[m.listSource] || m.listSource}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground text-xs capitalize">
                                {m.matchedField?.toLowerCase() || "Name"}
                              </td>
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
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
            Initializing Interface...
          </p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
