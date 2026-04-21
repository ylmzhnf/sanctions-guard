"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShieldAlert,
  Search,
  Database,
  ArrowRight,
  Loader2,
  Zap,
} from "lucide-react";
import clsx from "clsx";

interface DashboardLog {
  id: string | number;
  action: string;
  metadata?: {
    queryName?: string;
    riskLevel?: string;
    matchedCount?: number;
  };
  createdAt?: string;
  timestamp?: string;
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Dinamik Selamlama Mantığı
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.split(" ")[0] : "";

  // Audit Logları çek (Ekrandaki istatistikleri beslemek için)
  const { data: dashboardLogs = [], isLoading } = useQuery({
    queryKey: ["dashboard-logs"],
    queryFn: async () => {
      const response = await api.get("/audit/logs?limit=50");
      return response.data?.success ? response.data.data : (response.data ?? []);
    },
  });

  // Sadece Arama (Screening) işlemlerini filtrele ve ilk 5'i al
  const recentQueries = (dashboardLogs as DashboardLog[])
    .filter((log) => log.action?.includes("SCREENING") || log.metadata?.queryName)
    .slice(0, 5);

  // İstatistik Hesaplamaları
  const totalScreenings = dashboardLogs.filter((l: DashboardLog) => l.action?.includes("SCREENING")).length;

  const criticalMatches = dashboardLogs.filter((log: DashboardLog) => {
    const risk = log.metadata?.riskLevel?.toUpperCase();
    return risk === "CRITICAL" || risk === "HIGH" || risk === "EXACT MATCH";
  }).length;

  // Kota Hesaplaması (AppSumo/Lifetime desteğiyle)
  const isLifetime = user?.org?.isLifetime || user?.organization?.isLifetime;
  const limit = user?.org?.queriesLimit || user?.organization?.queriesLimit || 10;
  const used = user?.org?.queriesUsed || user?.organization?.queriesUsed || 0;
  const queriesRemaining = isLifetime ? "∞" : Math.max(0, limit - used);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header (Birleştirilmiş Karşılama) */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Here's your real-time compliance and risk overview.
        </p>
      </div>

      {/* Stat Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Screenings */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Total Screenings
              </p>
              {isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-black text-foreground mt-1">
                  {totalScreenings}
                </h3>
              )}
            </div>
          </div>
        </div>

        {/* High/Critical Matches */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                High/Critical Alerts
              </p>
              {isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-black text-foreground mt-1">
                  {criticalMatches}
                </h3>
              )}
            </div>
          </div>
        </div>

        {/* Queries Remaining */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Database className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Queries Remaining
              </p>
              <h3 className="text-3xl font-black text-foreground mt-1">
                {queriesRemaining}
                {!isLifetime && (
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    / {limit}
                  </span>
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Queries Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="font-bold text-foreground uppercase text-xs tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recent Queries
            </h2>
            <Link
              href="/dashboard/logs"
              className="text-xs text-primary hover:underline font-bold transition-colors"
            >
              View all logs &rarr;
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                <span className="text-sm font-medium">Fetching history...</span>
              </div>
            ) : recentQueries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 min-h-[300px]">
                <div className="bg-secondary p-4 rounded-full mb-4 border border-border">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-bold text-lg mb-2">
                  No queries yet
                </h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                  Your screening history is clean. Start by scanning your first
                  entity against global sanctions lists.
                </p>
                <button
                  onClick={() => router.push("/dashboard/search")}
                  className="text-primary hover:opacity-80 text-sm font-bold flex items-center gap-1 group transition-opacity"
                >
                  Run your first scan{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Search Subject</th>
                    <th className="px-6 py-4 text-center">Matches</th>
                    <th className="px-6 py-4 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentQueries.map((log) => {
                    const risk = log.metadata?.riskLevel || "CLEAR";
                    const isCritical = risk === "CRITICAL" || risk === "HIGH" || risk === "Exact Match";
                    const isWarning = risk === "MEDIUM";
                    const dateRaw = log.createdAt || log.timestamp;

                    return (
                      <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-foreground text-sm">
                            {log.metadata?.queryName || "Unknown Entity"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {dateRaw
                              ? new Date(dateRaw).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Just now"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs text-muted-foreground font-medium bg-secondary border border-border px-2.5 py-1 rounded-md">
                            {log.metadata?.matchedCount || 0} Matches
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge
                            className="text-[9px] px-2 py-0.5 uppercase h-5 font-bold shadow-sm"
                            variant={isCritical ? "critical" : isWarning ? "warning" : "default"}
                          >
                            {risk}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Action CTA Card */}
        <div className="lg:col-span-1 bg-primary rounded-2xl shadow-xl p-8 flex flex-col relative overflow-hidden h-full">
          {/* Arka plan deseni/ikonu */}
          <div className="absolute -top-4 -right-4 p-4 opacity-10 pointer-events-none">
            <Zap className="w-48 h-48 text-primary-foreground" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col">
            <div className="bg-primary-foreground/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-primary-foreground/30 shadow-inner">
              <Search className="w-6 h-6 text-primary-foreground" />
            </div>

            <h3 className="text-2xl font-bold text-primary-foreground mb-3">
              Screen an Entity Now
            </h3>
            <p className="text-primary-foreground/90 text-sm mb-8 leading-relaxed">
              Perform an instant fuzzy match search against OFAC, EU, UN, UK HMT
              and other global sanctions lists.
            </p>

            <div className="mt-auto">
              <button
                onClick={() => router.push("/dashboard/search")}
                className="w-full bg-background text-foreground hover:bg-secondary hover:scale-[1.02] px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                Open Screening Tool <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}