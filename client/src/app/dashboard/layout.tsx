"use client";

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
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { logout, user } = useAuthStore();

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/dashboard/search") return "Search";
    if (pathname === "/dashboard/logs") return "Audit Logs";
    if (pathname === "/dashboard/settings") return "Settings";
    return "SanctionsGuard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
      
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg text-foreground tracking-tight">
            SanctionsGuard
          </span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {[
            {
              id: "panel",
              icon: LayoutDashboard,
              label: "Dashboard",
              href: "/dashboard",
            },
            {
              id: "search",
              icon: Search,
              label: "Search",
              href: "/dashboard/search",
            },
            {
              id: "audit",
              icon: History,
              label: "Audit Logs",
              href: "/dashboard/logs",
            },
            ...(user?.role === "ADMIN"
              ? [
                  {
                    id: "settings",
                    icon: Settings,
                    label: "Settings",
                    href: "/dashboard/settings",
                  },
                ]
              : []),
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                pathname === item.href 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-6 border-t border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">
                {user ? user.role : "Loading..."}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user ? user.email : "Connecting..."}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login"); 
            }}
            className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 bg-card/50 border-b border-border flex items-center justify-between px-8 backdrop-blur-md">
          <h2 className="text-lg font-bold text-foreground">{getPageTitle()}</h2>
          <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
              Database Online
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}