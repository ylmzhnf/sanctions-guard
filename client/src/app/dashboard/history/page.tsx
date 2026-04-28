"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { 
  History, Search, Filter, Download, RefreshCcw, 
  FileText, ChevronLeft, ChevronRight, Loader2, Calendar, Shield, ScrollText
} from "lucide-react";
import { screening } from "@/lib/api";
import { RISK_CONFIG, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, riskFilter]);

  const { data, isLoading, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["screening-history", page, riskFilter, debouncedSearch],
    queryFn: () => screening.history(page, PAGE_SIZE, {
      riskLevel: riskFilter || undefined,
      queryName: debouncedSearch || undefined,
    }),
    placeholderData: (prev) => prev,
    refetchInterval: 5000, // Her 5 saniyede bir güncelle
    refetchOnWindowFocus: true,
  });

  const history = data?.queries || [];
  const totalPages = data?.pages || 1;

  const handleExportCSV = () => {
    if (!history.length) return;

    try {
      const headers = ["Date", "Queried Name", "Risk Level", "Match Count", "Analysis Summary"];
      const rows: string[][] = history.map((q: any) => [
        formatDate(q.createdAt),
        q.queryName,
        q.riskLevel,
        q.matchCount,
        q.aiExplanation?.replace(/[,\n]/g, " ") || "No analysis"
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" }); 
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit_history_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-[500px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
             <ScrollText className="w-4 h-4" /> Compliance Records
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Audit <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">Trail</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-xl leading-relaxed">
            Review your organization's entire history of background screenings, OSINT investigations, and AI-driven compliance decisions.
          </p>
        </div>
        
        <button 
          onClick={handleExportCSV}
          disabled={history.length === 0}
          className="bg-card/60 backdrop-blur-xl text-foreground hover:bg-muted border border-border/50 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-primary/10 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-primary" /> Export Data (CSV)
        </button>
      </div>

      {/* ── FILTERS & SEARCH ────────────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl p-6 rounded-3xl border border-border/50 shadow-sm flex flex-col lg:flex-row items-center gap-5 relative z-10">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search through audit records by name..." 
            className="w-full bg-background border border-border/50 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full lg:w-64">
            <select 
              className="w-full appearance-none bg-background border border-border/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-inner text-muted-foreground focus:text-foreground transition-all"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="">Filter: All Risk Levels</option>
              {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label} RISK</option>
              ))}
            </select>
            <Filter className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {isFetching && <Loader2 className="w-6 h-6 animate-spin text-primary shrink-0" />}
        </div>
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-transparent" />
        <div className="overflow-x-auto min-h-[500px] p-4">
          <table className="w-full text-left border-separate border-spacing-y-2 px-2">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                <th className="px-6 py-4">Threat Level</th>
                <th className="px-6 py-4">Screened Subject</th>
                <th className="px-6 py-4">Analysis</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !isPlaceholderData ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-background/20">
                    <td colSpan={5} className="px-6 py-6 rounded-2xl"><div className="h-10 bg-muted/50 rounded-xl w-full" /></td>
                  </tr>
                ))
              ) : history.length > 0 ? (
                history.map((q: any) => {
                  const risk = RISK_CONFIG[q.riskLevel as keyof typeof RISK_CONFIG] || RISK_CONFIG.CLEAR;
                  return (
                    <tr key={q.id} className={cn(
                      "bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl",
                      isPlaceholderData && "opacity-50"
                    )}>
                      <td className="px-6 py-5 rounded-l-2xl">
                        <Badge className={cn("uppercase text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg border", risk.bg, risk.color, risk.border)}>
                          {risk.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors">{q.queryName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">ID: {q.id.slice(0,12)}...</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border",
                            q.matchCount > 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            {q.matchCount} Matches
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                          <div className="p-1.5 rounded-md bg-muted border border-border/50">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          {formatDate(q.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right rounded-r-2xl">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => screening.downloadReport(q.id, q.queryName)}
                            className="p-2.5 bg-background border border-border/50 hover:bg-primary/10 text-primary rounded-xl transition-all hover:border-primary/20 shadow-sm"
                            title="Download PDF Report"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <Link 
                            href={`/dashboard/search?name=${encodeURIComponent(q.queryName)}`}
                            className="p-2.5 bg-background border border-border/50 hover:bg-emerald-500/10 text-emerald-600 rounded-xl transition-all hover:border-emerald-500/20 shadow-sm flex items-center justify-center"
                            title="Re-screen Identity"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-32 text-center rounded-2xl">
                    <div className="flex flex-col items-center gap-5">
                      <div className="bg-primary/5 p-8 rounded-full border border-primary/10 shadow-inner">
                        <Search className="w-12 h-12 text-primary opacity-50" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.3em] text-muted-foreground">No Records Found</p>
                      <Link href="/dashboard/search" className="text-[10px] uppercase tracking-widest text-primary font-black hover:scale-105 transition-transform bg-primary/10 px-6 py-3 rounded-xl border border-primary/20 shadow-sm">
                        Start New Screening
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-8 py-6 border-t border-border/50 bg-muted/10 flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
              Page <span className="text-foreground">{page}</span> / {totalPages}
            </span>
            <div className="flex gap-3">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="flex items-center gap-2 bg-card text-foreground hover:bg-muted disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.2em] py-3.5 px-6 rounded-xl transition-all border border-border/50 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="flex items-center gap-2 bg-card text-foreground hover:bg-muted disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.2em] py-3.5 px-6 rounded-xl transition-all border border-border/50 shadow-sm"
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