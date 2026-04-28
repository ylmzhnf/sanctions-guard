"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";
import { 
  Search, ShieldAlert, History, LayoutDashboard, Settings, LogOut, 
  User, CreditCard, Users, Menu, X, ShieldCheck, 
  ChevronRight, Bell, Zap, Database, Activity, Sparkles
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user: storeUser, token, setAuth } = useAuthStore();
  const { isSaas, allFeaturesUnlocked } = useFeatureFlags();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Sync data dynamically for real-time quota + plan updates
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: auth.me,
    staleTime: 0,           // Always consider data stale so invalidation fetches immediately
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5000,  // Her 5 saniyede bir güncelle
  });

  useEffect(() => {
    if (user && token && JSON.stringify(user) !== JSON.stringify(storeUser)) {
      setAuth(user, token);
    }
  }, [user, token, storeUser, setAuth]);

  // Handle header glassmorphism on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Güvenlik ve Yönlendirme Kontrolü
  useEffect(() => {
    if (isMounted) {
      if (!token || !user) {
        router.replace("/auth/login");
      } else if (user.mustChangePassword && pathname !== "/auth/change-password") {
        router.replace("/auth/change-password");
      }
    }
  }, [token, user, router, isMounted, pathname]);

  const usagePct = useMemo(() => {
    if (allFeaturesUnlocked || !user?.org) return 0;
    const { queriesUsed, queriesLimit } = user.org;
    if (queriesLimit === -1) return 0;
    return Math.min(100, (queriesUsed / (queriesLimit || 1)) * 100);
  }, [user, allFeaturesUnlocked]);

  if (!isMounted || !user || !token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground animate-pulse">Initializing Protocol...</p>
      </div>
    );
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const menuGroups = [
    {
      label: "Intelligence",
      items: [
        { id: "panel", icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { id: "search", icon: Search, label: "Screening Tool", href: "/dashboard/search" },
        { id: "history", icon: History, label: "Audit History", href: "/dashboard/history" },
        { id: "audit", icon: ShieldAlert, label: "System Logs", href: "/dashboard/logs" },
      ]
    },
    {
      label: "Management",
      items: [
        ...(isSaas ? [{ id: "billing", icon: CreditCard, label: "Billing & Plans", href: "/dashboard/billing" }] : []),
        { id: "settings", icon: Settings, label: "System Config", href: "/dashboard/settings" },
      ]
    },
    ...(isAdmin ? [{
      label: "Administration",
      items: [
        { id: "overseer", icon: Sparkles, label: "System Overseer", href: "/dashboard/admin" },
        { id: "sync", icon: Database, label: "Database Sync", href: "/dashboard/admin/sync" },
        { id: "users", icon: Users, label: "Global Team", href: "/dashboard/admin/users" },
      ]
    }] : [])
  ];

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Mission Control";
    const segment = pathname.split('/').pop() || "";
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Hamburger Button (sol) */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Close Button (sağ üst) */}
      {isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed top-4 right-4 z-[60] p-2.5 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* ── 1. SIDEBAR (Sol Navigasyon) ────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-card/50 backdrop-blur-2xl border-r border-white/5 dark:border-white/10 transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static flex flex-col shrink-0 shadow-2xl lg:shadow-none h-screen",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Brand Area */}
        <div className="h-24 flex items-center px-8 border-b border-white/5 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <Link href="/dashboard" className="flex items-center gap-4 relative z-10 w-full" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-primary p-2.5 rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.3)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl text-foreground tracking-tighter">
                Sanctions<span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Guard</span>
              </span>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] leading-none mt-1">Compliance Engine</span>
            </div>
          </Link>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-10 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex items-center gap-2">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link key={item.id} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all duration-300 group relative overflow-hidden",
                      isActive 
                        ? "text-primary-foreground font-black shadow-lg" 
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground font-bold"
                    )}>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
                      )}
                      {isActive && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                      )}
                      <div className="flex items-center gap-3 relative z-10">
                        <item.icon className={cn("w-4 h-4 transition-transform duration-300", isActive ? "text-primary-foreground" : "group-hover:scale-110", isActive && "animate-pulse")} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3 relative z-10 opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Quota & License Section (Hibrit) */}
        <div className="p-5 border-t border-white/5 bg-gradient-to-b from-transparent to-muted/20 shrink-0">
          {allFeaturesUnlocked ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5 rounded-3xl flex items-center gap-4 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-0.5">Enterprise Core</span>
                <span className="text-[11px] font-bold text-emerald-600/70">Unrestricted Access</span>
              </div>
            </div>
          ) : (
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 rounded-3xl space-y-4 hover:border-border transition-colors">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Monthly Quota</span>
                <span className="text-xs font-black">{user.org?.queriesUsed} / {user.org?.queriesLimit === -1 ? "∞" : user.org?.queriesLimit}</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={cn("h-full transition-all duration-1000 relative", usagePct > 80 ? "bg-destructive" : "bg-primary")} 
                  style={{ width: `${usagePct}%` }} 
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                </div>
              </div>
              {isSaas && (
                <Link href="/dashboard/billing" className="flex items-center justify-center gap-2 py-3 mt-2 bg-primary/10 text-primary text-[10px] font-black rounded-xl hover:bg-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] group">
                  <Zap className="w-3 h-3 group-hover:fill-current transition-all" /> Upgrade Capacity
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sign Out Action */}
        <div className="px-5 py-4 shrink-0">
          <button 
            onClick={() => { logout(); router.push("/auth/login"); }} 
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-black text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="uppercase tracking-widest text-[11px]">Secure Logout</span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── 2. MAIN AREA (İçerik) ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-gradient-to-br from-background to-muted/20">
        
        {/* Dynamic Header */}
        <header className={cn(
          "h-24 shrink-0 flex items-center justify-between px-6 lg:px-12 z-20 transition-all duration-500 sticky top-0",
          scrolled ? "bg-background/80 backdrop-blur-2xl border-b border-border shadow-sm" : "bg-transparent"
        )}>
           <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <h2 className="text-2xl font-black text-foreground tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                 {getPageTitle()}
               </h2>
               <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Network Secured</span>
               </div>
             </div>
           </div>

           <div className="flex items-center gap-6">
              <button className="p-3 text-muted-foreground hover:bg-muted hover:text-foreground rounded-2xl transition-all relative group">
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
              </button>
              
              <div className="h-10 w-px bg-border/50 hidden sm:block" />
              
              <div className="hidden sm:flex items-center gap-4 bg-card/50 backdrop-blur-md border border-border/50 px-5 py-2.5 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex flex-col items-end">
                   <span className="text-xs font-black text-foreground tracking-tight">{user.name?.split(" ")[0] || "User"}</span>
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{user.org?.name}</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                  <User className="w-5 h-5" />
                </div>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 custom-scrollbar relative">
          {/* Background decorative elements */}
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}