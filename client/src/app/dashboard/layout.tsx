"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  Search,
  ShieldAlert,
  History,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Activity,
  CreditCard,
  Database,
  Users,
  Menu,
  X,
  ShieldCheck
} from "lucide-react";
import clsx from "clsx";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, token } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Oturum kontrolü
  useEffect(() => {
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    if (user?.mustChangePassword) {
      router.replace("/auth/change-password");
    }
  }, [token, user, router]);

  if (!token || !user) return null;
  if (user.mustChangePassword) return null;

  const isAdmin = user.role === "ADMIN";

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard Overview";
    if (pathname === "/dashboard/search") return "Sanctions Search";
    if (pathname === "/dashboard/logs") return "Immutable Audit Logs";
    if (pathname === "/dashboard/billing") return "Billing & Plans";
    if (pathname === "/dashboard/admin/sync") return "Database Synchronization";
    if (pathname === "/dashboard/admin/users") return "Team Management";
    return "SanctionsGuard";
  };

 const MAIN_MENU = [
    { id: "panel", icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { id: "search", icon: Search, label: "Search Engine", href: "/dashboard/search" },
    { id: "audit", icon: History, label: "Audit Logs", href: "/dashboard/logs" },
    { id: "billing", icon: CreditCard, label: "Billing & Plans", href: "/dashboard/billing" },
    { id: "settings", icon: Settings, label: "Settings", href: "/dashboard/settings" }, // SETTINGS GERİ GELDİ
  ];

  const ADMIN_MENU = [
    { id: "sync", icon: Database, label: "Database Sync", href: "/dashboard/admin/sync" },
    { id: "users", icon: Users, label: "Team Management", href: "/dashboard/admin/users" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
      
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-3 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-md"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
      </button>

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col shrink-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsMobileMenuOpen(false)}>
            <ShieldCheck className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-lg text-foreground tracking-tight">
              SanctionsGuard
            </span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Main Menu
            </p>
            <nav className="space-y-1">
              {MAIN_MENU.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all",
                    pathname === item.href 
                      ? "bg-primary text-primary-foreground shadow-md font-bold" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {isAdmin && (
            <div>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Admin Tools
              </p>
              <nav className="space-y-1">
                {ADMIN_MENU.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all border",
                      pathname === item.href 
                        ? "bg-primary/10 text-primary border-primary/20 font-bold" 
                        : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground font-medium hover:border-border"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
        
        <div className="p-5 border-t border-border bg-muted/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border shadow-sm">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-foreground truncate">
                {user.name || "User"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary truncate">
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login"); 
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-screen min-w-0">
        
        <header className="h-16 shrink-0 bg-background/80 border-b border-border flex items-center justify-between px-8 lg:px-10 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 lg:hidden"></div> 
            <h2 className="text-lg font-bold text-foreground">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
              Online
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-muted/10">
          <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}