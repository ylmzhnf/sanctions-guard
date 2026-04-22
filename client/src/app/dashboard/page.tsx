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
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user-status"],
    queryFn: async () => {
      const response = await api.get("/users/me");
      return response.data;
    },
    refetchOnWindowFocus: true,
  });

  const { data: dashboardLogs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ["dashboard-logs"],
    queryFn: async () => {
      const response = await api.get("/audit/logs?limit=50");
      return response.data?.success ? response.data.data : (response.data ?? []);
    },
  });

  const activeOrg = userData?.organization || user?.organization || user?.org;
  
  const isLifetime = activeOrg?.isLifetime;
  const limit = activeOrg?.queriesLimit || 10;
  const used = activeOrg?.queriesUsed || 0;
  const queriesRemaining = isLifetime ? "∞" : Math.max(0, limit - used);
  const isLimitReached = !isLifetime && Number(queriesRemaining) <= 0;

  const totalScreenings = dashboardLogs.filter((l: any) => l.action?.includes("SCREENING")).length;
  const criticalMatches = dashboardLogs.filter((log: any) => {
    const risk = log.metadata?.riskLevel?.toUpperCase();
    return ["CRITICAL", "HIGH", "EXACT MATCH"].includes(risk);
  }).length;

  const recentQueries = dashboardLogs.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      
      {isLimitReached && (
        <div className="bg-destructive border border-destructive/20 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Search limit reached!</h3>
              <p className="text-white/80 text-sm font-medium">Your monthly quota is exhausted. Upgrade to continue screening.</p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="w-full md:w-auto bg-white text-destructive hover:bg-opacity-90 px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg text-center"
          >
            UPGRADE NOW
          </Link>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time compliance monitoring dashboard.</p>
        </div>
        {!isLifetime && (
           <Badge variant={isLimitReached ? "critical" : "outline"} className="px-3 py-1">
             {activeOrg?.plan || "FREE"} PLAN
           </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          icon={<Activity className="w-6 h-6 text-primary" />} 
          label="Total Screenings" 
          value={totalScreenings} 
          isLoading={isLogsLoading} 
        />
        <StatCard 
          icon={<ShieldAlert className="w-6 h-6 text-destructive" />} 
          label="High/Critical Alerts" 
          value={criticalMatches} 
          isLoading={isLogsLoading} 
          color="destructive"
        />
        <StatCard 
          icon={<Database className={clsx("w-6 h-6", isLimitReached ? "text-destructive" : "text-emerald-500")} />} 
          label="Queries Remaining" 
          value={queriesRemaining} 
          isLoading={isUserLoading} 
          subValue={!isLifetime ? `/ ${limit}` : undefined}
          color={isLimitReached ? "destructive" : "emerald"}
          highlight={isLimitReached}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="font-bold text-foreground uppercase text-xs tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recent Queries
            </h2>
            <Link href="/dashboard/logs" className="text-xs text-primary hover:underline font-bold">View all &rarr;</Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {isLogsLoading ? (
              <div className="h-full flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : recentQueries.length === 0 ? (
              <EmptyState router={router} />
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-widest font-bold border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4 text-center">Matches</th>
                    <th className="px-6 py-4 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentQueries.map((log: any) => (
                    <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground text-sm">{log.metadata?.queryName || "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-medium bg-secondary border border-border px-2 py-1 rounded">
                          {log.metadata?.matchedCount ?? 0} Hits
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={getBadgeVariant(log.metadata?.riskLevel)} className="text-[9px] uppercase font-black">
                          {log.metadata?.riskLevel || "CLEAR"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={clsx(
          "lg:col-span-1 rounded-2xl shadow-xl p-8 flex flex-col relative overflow-hidden h-full transition-colors",
          isLimitReached ? "bg-card border-2 border-destructive" : "bg-primary text-primary-foreground"
        )}>
          <div className="absolute -top-4 -right-4 p-4 opacity-10">
            {isLimitReached ? <AlertTriangle className="w-48 h-48 text-destructive" /> : <Zap className="w-48 h-48" />}
          </div>

          <div className="relative z-10 flex-1 flex flex-col">
            <div className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-inner border",
              isLimitReached ? "bg-destructive/10 border-destructive/20" : "bg-white/20 border-white/30"
            )}>
              {isLimitReached ? <ShieldAlert className="w-6 h-6 text-destructive" /> : <Search className="w-6 h-6 text-white" />}
            </div>

            <h3 className={clsx("text-2xl font-bold mb-3", isLimitReached ? "text-foreground" : "text-white")}>
              {isLimitReached ? "Limit Reached" : "Screen an Entity"}
            </h3>
            <p className={clsx("text-sm mb-8 leading-relaxed", isLimitReached ? "text-muted-foreground" : "text-white/90")}>
              {isLimitReached 
                ? "Your organization's monthly screening quota has been exhausted. Upgrade now to restore access."
                : "Perform a fuzzy match search against global sanctions lists in milliseconds."}
            </p>

            <button
              onClick={() => router.push(isLimitReached ? "/dashboard/billing" : "/dashboard/search")}
              className={clsx(
                "mt-auto w-full px-5 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                isLimitReached 
                  ? "bg-destructive text-white hover:bg-destructive/90" 
                  : "bg-white text-primary hover:bg-secondary"
              )}
            >
              {isLimitReached ? "Upgrade Plan" : "Open Search Tool"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function StatCard({ icon, label, value, isLoading, subValue, color = "primary", highlight = false }: any) {
  return (
    <div className={clsx(
      "bg-card p-6 rounded-2xl border transition-all shadow-lg",
      highlight ? "border-destructive ring-1 ring-destructive" : "border-border"
    )}>
      <div className="flex items-center gap-4">
        <div className={clsx(
          "p-3 rounded-xl border",
          color === "primary" && "bg-primary/10 border-primary/20",
          color === "destructive" && "bg-destructive/10 border-destructive/20",
          color === "emerald" && "bg-emerald-500/10 border-emerald-500/20"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{label}</p>
          {isLoading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <h3 className={clsx("text-3xl font-black mt-1", highlight && "text-destructive")}>
              {value} {subValue && <span className="text-sm font-medium text-muted-foreground">{subValue}</span>}
            </h3>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ router }: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 min-h-[350px]">
      <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-foreground font-bold text-lg">Clean History</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">Start your first automated screening to see activity here.</p>
      <button onClick={() => router.push("/dashboard/search")} className="text-primary font-bold flex items-center gap-2">
        Launch Tool <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function getBadgeVariant(risk: string): any {
  const r = risk?.toUpperCase();
  if (["CRITICAL", "HIGH", "EXACT MATCH"].includes(r)) return "critical";
  if (r === "MEDIUM") return "warning";
  return "default";
}