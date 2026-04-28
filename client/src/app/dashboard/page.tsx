"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, ShieldAlert, Search, Database, 
  ArrowRight, Loader2, Zap, AlertTriangle, 
  TrendingUp, ShieldCheck, Sparkles
} from "lucide-react";

import { auth, screening } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn, RISK_CONFIG, formatDate, PLAN_LABELS } from "@/lib/utils";

export default function DashboardHomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const storeUser = useAuthStore((s) => s.user);
  const { allFeaturesUnlocked, isSaas } = useFeatureFlags();

  useEffect(() => { setIsMounted(true); }, []);

  // --- Veri Çekme Katmanı (SWR Mantığı) ---
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: auth.me,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5000, // Her 5 saniyede bir güncelle
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["recent-screenings"],
    queryFn: () => screening.history(1, 5),
    refetchInterval: 5000, // Her 5 saniyede bir güncelle
    refetchOnWindowFocus: true,
  });

  // --- Metrik Hesaplamaları ---
  const stats = useMemo(() => {
    const queries = history?.queries || [];
    const limit = user?.org?.queriesLimit || 10;
    const used = user?.org?.queriesUsed || 0;
    
    const remaining = (allFeaturesUnlocked || limit === -1) ? "∞" : Math.max(0, limit - used);
    const limitReached = (!allFeaturesUnlocked && limit !== -1) && used >= limit;
    const highRisk = queries.filter((q: any) => ['HIGH', 'CRITICAL'].includes(q.riskLevel)).length;

    return {
      total: history?.total || 0,
      highRisk,
      remaining,
      limitReached,
      limit,
      recent: queries.slice(0, 5)
    };
  }, [history, user, allFeaturesUnlocked]);

  if (!isMounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-16 font-sans">
      
      {/* ── Limit Uyarısı (Quota Exhausted) ──────────────────────────────── */}
      {stats.limitReached && (
        <div className="relative overflow-hidden bg-gradient-to-r from-destructive/20 to-background border border-destructive/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] animate-in slide-in-from-top-4 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 blur-[80px] rounded-full group-hover:bg-destructive/20 transition-colors duration-1000" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-destructive/20 p-4 rounded-2xl shrink-0 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-destructive animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-destructive">Quota Exhausted</h3>
              <p className="text-foreground/80 text-sm font-medium mt-1.5 max-w-lg leading-relaxed">
                Your organization has reached its screening capacity. Compliance operations are suspended until the limit is extended or billing is upgraded.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="w-full md:w-auto relative z-10 bg-destructive text-white hover:bg-destructive/90 hover:scale-105 active:scale-95 px-10 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg text-center shrink-0"
          >
            Upgrade Plan Now
          </Link>
        </div>
      )}

      {/* ── Karşılama ve Plan Etiketi ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">{user?.name?.split(" ")[0] || "Commander"}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-3 font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Real-time compliance intelligence is active and monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allFeaturesUnlocked && (
            <div className="px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Enterprise Secured
            </div>
          )}
          <div className={cn(
            "px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-[0.2em] border shadow-sm flex items-center gap-2",
            stats.limitReached ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-card text-foreground border-border"
          )}>
            <div className={cn("w-2 h-2 rounded-full", stats.limitReached ? "bg-destructive" : "bg-primary")} />
            {PLAN_LABELS[(user?.org?.plan as keyof typeof PLAN_LABELS)] || "FREE"} PLAN
          </div>
        </div>
      </div>

      {/* ── İstatistik Kartları ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <StatCard 
          icon={<TrendingUp className="w-7 h-7 text-blue-500" />} 
          label="Total Screenings" 
          value={stats.total} 
          isLoading={isHistoryLoading} 
          colorClass="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500"
          glowClass="shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]"
        />
        <StatCard 
          icon={<ShieldAlert className="w-7 h-7 text-destructive" />} 
          label="High/Critical Alerts" 
          value={stats.highRisk} 
          isLoading={isHistoryLoading} 
          colorClass="bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/20 text-destructive"
          glowClass={stats.highRisk > 0 ? "shadow-[0_0_30px_-10px_rgba(239,68,68,0.4)]" : "shadow-[0_0_30px_-10px_rgba(239,68,68,0.1)]"}
          valueClass={stats.highRisk > 0 ? "text-destructive" : ""}
        />
        <StatCard 
          icon={<Database className={cn("w-7 h-7", stats.limitReached ? "text-destructive" : "text-emerald-500")} />} 
          label="Queries Remaining" 
          value={stats.remaining} 
          isLoading={isUserLoading} 
          subValue={!allFeaturesUnlocked && stats.limit !== -1 ? `/ ${stats.limit}` : undefined}
          colorClass={stats.limitReached ? "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/20 text-destructive" : "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500"}
          highlight={stats.limitReached}
          glowClass={stats.limitReached ? "shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]" : "shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]"}
        />
      </div>

      {/* ── Alt Grid: Tablo ve Hızlı Eylem ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sol Taraf: Son Sorgular Tablosu */}
        <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border shadow-xl overflow-hidden flex flex-col min-h-[460px] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
          <div className="px-10 py-8 border-b border-border/50 bg-muted/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-black text-foreground uppercase text-sm tracking-[0.2em]">Recent Intelligence</h2>
            </div>
            <Link href="/dashboard/history" className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition-all tracking-[0.2em]">
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto p-2">
            {isHistoryLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-20 text-muted-foreground gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Decrypting Records...</span>
              </div>
            ) : stats.recent.length === 0 ? (
              <EmptyState router={router} />
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-2 px-6">
                <thead className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                  <tr>
                    <th className="px-6 py-4 font-black">Entity Subject</th>
                    <th className="px-6 py-4 text-center font-black">Matches</th>
                    <th className="px-6 py-4 text-right font-black">Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((query: any) => {
                    const risk = RISK_CONFIG[query.riskLevel as keyof typeof RISK_CONFIG] || RISK_CONFIG.CLEAR;
                    return (
                      <tr 
                        key={query.id} 
                        className="bg-background/40 hover:bg-muted/50 transition-all cursor-pointer group shadow-sm hover:shadow-md rounded-2xl" 
                        onClick={() => router.push(`/dashboard/history/${query.id}`)}
                      >
                        <td className="px-6 py-5 rounded-l-2xl">
                          <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate max-w-[250px]">
                            {query.queryName}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-1 tracking-widest uppercase">
                            {formatDate(query.createdAt)}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-[11px] font-black bg-background border border-border/50 px-3 py-1.5 rounded-xl shadow-sm">
                            {query.matchCount} <span className="text-muted-foreground ml-1">HITS</span>
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right rounded-r-2xl">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-4 py-2 rounded-xl border tracking-[0.2em] shadow-sm", 
                            risk.bg, risk.color, risk.border
                          )}>
                            {risk.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Hızlı Aksiyon Kartı */}
        <div className={cn(
          "lg:col-span-1 rounded-[2.5rem] shadow-2xl p-10 flex flex-col relative overflow-hidden h-full transition-all duration-500 border group",
          stats.limitReached ? "bg-card border-destructive/30" : "bg-primary border-primary hover:shadow-[0_0_50px_-10px_rgba(var(--primary),0.5)]"
        )}>
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 bg-mesh opacity-20 mix-blend-overlay pointer-events-none" />
          
          <div className="absolute -bottom-10 -right-10 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 pointer-events-none">
            {stats.limitReached ? <AlertTriangle className="w-64 h-64 text-destructive" /> : <Search className="w-64 h-64 text-white" />}
          </div>

          <div className="relative z-10 flex-1 flex flex-col">
            <div className={cn(
              "w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border backdrop-blur-md",
              stats.limitReached ? "bg-destructive/10 border-destructive/30" : "bg-white/20 border-white/40"
            )}>
              {stats.limitReached ? <ShieldAlert className="w-8 h-8 text-destructive" /> : <Search className="w-8 h-8 text-white" />}
            </div>

            <h3 className={cn("text-4xl font-black mb-4 tracking-tighter leading-none", stats.limitReached ? "text-foreground" : "text-white")}>
              {stats.limitReached ? "Operations Suspended" : "Ready to Screen?"}
            </h3>
            <p className={cn("text-sm mb-10 leading-relaxed font-medium", stats.limitReached ? "text-muted-foreground" : "text-white/80")}>
              {stats.limitReached 
                ? "Your compliance operations are paused. Please upgrade your active plan to continue screening."
                : "Perform a real-time deep scan against global watchlists, OFAC, UN, and EU databases."}
            </p>

            <button
              onClick={() => router.push(stats.limitReached ? "/dashboard/billing" : "/dashboard/search")}
              className={cn(
                "mt-auto w-full px-6 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-between transition-all duration-300 shadow-xl",
                stats.limitReached 
                  ? "bg-destructive text-white hover:bg-destructive/90 hover:scale-[1.02]" 
                  : "bg-background text-foreground hover:bg-white hover:scale-[1.02]"
              )}
            >
              <span>{stats.limitReached ? "View Upgrade Options" : "Launch Engine"}</span> 
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", stats.limitReached ? "bg-white/20" : "bg-primary/10")}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Alt Bileşenler ---

function StatCard({ icon, label, value, isLoading, subValue, colorClass, highlight = false, glowClass, valueClass }: any) {
  return (
    <div className={cn(
      "bg-card/50 backdrop-blur-xl p-8 rounded-[2rem] border transition-all duration-500 flex items-start gap-6 hover:-translate-y-1 relative overflow-hidden group",
      highlight ? "border-destructive/50 ring-1 ring-destructive" : "border-border/50 hover:border-primary/50",
      glowClass
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      <div className={cn("p-4 rounded-2xl border shrink-0 shadow-inner relative z-10", colorClass)}>
        {icon}
      </div>
      <div className="relative z-10 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2">{label}</p>
        {isLoading ? (
          <div className="h-10 w-24 bg-muted/50 animate-pulse rounded-xl" />
        ) : (
          <h3 className={cn("text-4xl font-black tracking-tighter leading-none", highlight && "text-destructive", valueClass)}>
            {value} 
            {subValue && <span className="text-sm font-bold text-muted-foreground ml-2 tracking-normal">{subValue}</span>}
          </h3>
        )}
      </div>
    </div>
  );
}

function EmptyState({ router }: { router: any }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <div className="bg-card border border-border p-6 rounded-3xl relative z-10 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-primary" />
        </div>
      </div>
      <h3 className="text-foreground font-black text-2xl tracking-tight mb-2">No Screenings Yet</h3>
      <p className="text-muted-foreground text-sm max-w-[300px] font-medium leading-relaxed mb-8">
        Your audit trail is currently empty. Initialize your first screening to populate the history.
      </p>
      <button 
        onClick={() => router.push("/dashboard/search")} 
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
      >
        Start Screening <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}