"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldAlert,
  Search,
  Database,
  ArrowRight,
  Loader2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

import { auth, screening } from "@/lib/api";
import { cn, RISK_CONFIG, formatDate } from "@/lib/utils";

export default function DashboardHomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: auth.me,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5000,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["recent-screenings"],
    queryFn: () => screening.history(1, 5),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const stats = useMemo(() => {
    const queries = history?.queries || [];
    const highRisk = queries.filter((q: any) =>
      ["HIGH", "CRITICAL"].includes(q.riskLevel),
    ).length;

    return {
      total: history?.total || 0,
      highRisk,
      recent: queries.slice(0, 5),
    };
  }, [history]);

  if (!isMounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-slate-600 bg-clip-text text-transparent">
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            All systems online
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Real-time monitoring
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          label="Total screenings"
          value={stats.total}
          isLoading={isHistoryLoading}
          colorClass="bg-blue-50 border-blue-100 text-blue-600"
        />
        <StatCard
          icon={<ShieldAlert className="w-5 h-5 text-red-600" />}
          label="High / critical alerts"
          value={stats.highRisk}
          isLoading={isHistoryLoading}
          colorClass="bg-red-50 border-red-100 text-red-600"
          valueClass={stats.highRisk > 0 ? "text-red-600" : ""}
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-emerald-600" />}
          label="Screening engine"
          value="Synchronized"
          isLoading={false}
          colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
          valueClass="text-lg md:text-xl text-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-5 md:px-6 py-4 border-b border-border bg-slate-50/80 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary/10 rounded-md shrink-0">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground text-sm truncate">
                Recent Screenings
              </h2>
            </div>
            <Link
              href="/dashboard/history"
              className="text-xs font-medium text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors shrink-0"
            >
              View all
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {isHistoryLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
                <span className="text-xs font-medium">Loading records…</span>
              </div>
            ) : stats.recent.length === 0 ? (
              <EmptyState router={router} />
            ) : (
              <table className="w-full text-left">
                <thead className="text-xs text-muted-foreground uppercase tracking-wide font-medium border-b border-border">
                  <tr>
                    <th className="px-5 md:px-6 py-3 font-medium">Entity</th>
                    <th className="px-5 md:px-6 py-3 text-center font-medium">
                      Matches
                    </th>
                    <th className="px-5 md:px-6 py-3 text-right font-medium">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent.map((query: any) => {
                    const risk =
                      RISK_CONFIG[
                        query.riskLevel as keyof typeof RISK_CONFIG
                      ] || RISK_CONFIG.CLEAR;
                    return (
                      <tr
                        key={query.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/dashboard/search?name=${encodeURIComponent(query.queryName)}`,
                          )
                        }
                      >
                        <td className="px-5 md:px-6 py-4">
                          <p className="font-medium text-foreground text-sm truncate max-w-[220px] md:max-w-[280px]">
                            {query.queryName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(query.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 md:px-6 py-4 text-center">
                          <span className="text-xs font-medium bg-slate-50 border border-border px-2.5 py-1 rounded-md">
                            {query.matchCount}
                          </span>
                        </td>
                        <td className="px-5 md:px-6 py-4 text-right">
                          <span
                            className={cn(
                              "text-[11px] font-semibold uppercase px-2.5 py-1 rounded-md border",
                              risk.bg,
                              risk.color,
                              risk.border,
                            )}
                          >
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

        <div className="lg:col-span-1 rounded-lg border border-border bg-slate-900 p-6 md:p-8 flex flex-col">
          <div className="w-11 h-11 rounded-md flex items-center justify-center mb-6 bg-white/10 border border-white/10">
            <Search className="w-5 h-5 text-white" />
          </div>

          <h3 className="text-xl font-semibold mb-2 tracking-tight text-white">
            New screening
          </h3>
          <p className="text-sm mb-8 leading-relaxed text-slate-300">
            Screen an entity against OFAC, UN, EU, and UK watchlists.
          </p>

          <button
            onClick={() => router.push("/dashboard/search")}
            className="mt-auto w-full px-4 py-3 rounded-md font-semibold text-sm flex items-center justify-between transition-colors bg-white text-slate-900 hover:bg-slate-100"
          >
            <span>Start screening</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isLoading,
  subValue,
  colorClass,
  valueClass,
}: any) {
  return (
    <div className="bg-card p-5 md:p-6 rounded-lg border border-border shadow-sm flex items-start gap-4">
      <div
        className={cn(
          "p-2.5 rounded-md border shrink-0",
          colorClass,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
          {label}
        </p>
        {isLoading ? (
          <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
        ) : (
          <h3
            className={cn(
              "text-2xl md:text-3xl font-semibold tracking-tight leading-none text-foreground",
              valueClass,
            )}
          >
            {value}
            {subValue && (
              <span className="text-sm font-medium text-muted-foreground ml-2">
                {subValue}
              </span>
            )}
          </h3>
        )}
      </div>
    </div>
  );
}

function EmptyState({ router }: { router: any }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 min-h-[360px]">
      <div className="bg-slate-50 border border-border p-4 rounded-lg mb-5">
        <ShieldCheck className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-foreground font-semibold text-lg tracking-tight mb-2">
        No screenings yet
      </h3>
      <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mb-6">
        Run your first screening to populate the audit history.
      </p>
      <button
        onClick={() => router.push("/dashboard/search")}
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 transition-colors"
      >
        Start screening <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
