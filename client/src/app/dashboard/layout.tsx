"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { 
  Search, ShieldAlert, History, LayoutDashboard, 
  Settings, LogOut, User, Activity 
} from 'lucide-react';
import { useEffect } from "react";
import api from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, setUser } = useAuthStore();
  
  useEffect(() => {
    if (!user) {
      api.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => {});
    }
  }, [user, setUser]);

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/search') return 'Search';
    if (pathname === '/dashboard/logs') return 'Audit Logs';
    if (pathname === '/dashboard/settings') return 'Settings';
    return 'SanctionsGuard';
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-200 flex font-sans overflow-hidden">
      <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <ShieldAlert className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-lg text-white tracking-tight">SanctionsGuard</span>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'panel', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
            { id: 'search', icon: Search, label: 'Search', href: '/dashboard/search' },
            { id: 'audit', icon: History, label: 'Audit Logs', href: '/dashboard/logs' },
            ...(user?.role === 'ADMIN' ? [{ id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings' }] : []),
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${pathname === item.href ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User className="w-4 h-4 text-slate-300" /></div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate"> {user ? user.role : 'Loading...'}</p>
              <p className="text-[10px] text-slate-500 truncate"> {user ? user.email : 'Connecting...'}</p></div>
          </div>
          <button onClick={() => { logout(); router.push('/login'); }} className="flex items-center space-x-2 text-xs text-slate-500 hover:text-red-400">
            <LogOut className="w-3 h-3" /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 bg-[#111827]/50 border-b border-slate-800 flex items-center justify-between px-8 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white">{getPageTitle()}</h2>
          <div className="flex items-center space-x-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <Activity className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Database Online</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}