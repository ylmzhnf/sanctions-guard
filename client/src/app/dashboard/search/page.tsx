"use client";

import { useState } from "react";
import {
  Search,
  ShieldCheck,
  BrainCircuit,
  Lock,
  AlertCircle,
  Info,
  Loader2,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
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

type Match = {
  id: string;
  matchedName: string;
  score: number;
  listSource: string;
  matchedField: string;
};

type ScreeningResult = {
  success: boolean;
  count: number;
  riskLevel: string;
  aiExplanation?: string;
  data: Match[];
  queryId?: string;
};

export default function SearchPage() {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState("");

  const searchMutation = useMutation<
    ScreeningResult,
    any,
    { name: string; type: string }
  >({
    mutationFn: async (params) => {
      // Backend @Get('search') rotasına query parametreleri ile istek atıyoruz
      const response = await api.get("/screening/search", {
        params: {
          queryName: params.name,
          entityType: params.type || undefined,
        },
      });
      return response.data;
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
    setError("");
    searchMutation.mutate({ name: name.trim(), type: entityType });
  };

  const isSearching = searchMutation.isPending;
  const result = searchMutation.data;

  const getRiskConfig = (risk: string) => {
    const level = risk?.toUpperCase();
    if (level === "CRITICAL" || level === "EXACT MATCH")
      return {
        color: "text-destructive",
        badge: "critical",
        bg: "bg-destructive/10 border-destructive/30",
      };
    if (level === "HIGH")
      return {
        color: "text-destructive",
        badge: "critical",
        bg: "bg-destructive/10 border-destructive/30",
      };
    if (level === "MEDIUM")
      return {
        color: "text-amber-500",
        badge: "warning",
        bg: "bg-amber-500/10 border-amber-500/30",
      };
    if (level === "LOW")
      return {
        color: "text-blue-500",
        badge: "default",
        bg: "bg-blue-500/10 border-blue-500/30",
      };
    return {
      color: "text-emerald-500",
      badge: "default",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    };
  };

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary text-sm">
            Sanctions Screening Engine
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Search across OFAC SDN, EU Consolidated, and UN sanctions lists
            simultaneously. AI analysis provides real-time risk context.
          </p>
        </div>
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
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              {isSearching ? "Screening..." : "Screen Now"}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Include full name and middle names where possible for best
              accuracy.
            </p>
            <div className="hidden md:flex items-center space-x-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <span className="flex items-center">
                <BrainCircuit className="w-3 h-3 mr-1 text-purple-500" /> AI
                Scoring
              </span>
              <span className="flex items-center">
                <Lock className="w-3 h-3 mr-1 text-emerald-500" /> Audit Logged
              </span>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 animate-shake flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {result && riskConfig && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {result.riskLevel === "CLEAR" || result.count === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-lg">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                No Sanctions Matches Found
              </h2>
              <p className="text-muted-foreground text-sm">
                The entity <strong>"{name}"</strong> does not appear on OFAC,
                EU, UN or other connected watchlists.
              </p>
            </div>
          ) : (
            <>
              <div
                className={clsx(
                  "rounded-2xl p-6 border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg",
                  riskConfig.bg,
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={clsx(
                      "w-3 h-3 rounded-full animate-pulse",
                      `bg-${riskConfig.color.split("-")[1]}-500`,
                    )}
                  />
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      "{name}"
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {result.count} match{result.count !== 1 ? "es" : ""} found
                      across international databases.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={riskConfig.badge as any}
                  className="px-4 py-1.5 uppercase text-sm font-black tracking-widest shadow-sm"
                >
                  {result.riskLevel} RISK
                </Badge>
              </div>

              {result.aiExplanation && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-primary/5 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-foreground text-sm uppercase tracking-widest">
                      AI Intelligence Analysis
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.aiExplanation}
                    </p>
                    <div className="mt-6 pt-4 border-t border-border flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        This is an automated analysis for informational purposes
                        only. Not legal advice. Always conduct human review for
                        HIGH and CRITICAL matches.
                      </p>
                    </div>
                  </div>
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
                          const isHighMatch = scoreNum >= 85;

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
                                  variant={isHighMatch ? "critical" : "warning"}
                                  className="font-mono text-xs"
                                >
                                  {formatScore(m.score)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md font-medium border border-border">
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