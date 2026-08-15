"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { auth, notifications } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import { isAdmin, isSuperAdmin } from "@/lib/auth-utils";
import {
  Search,
  ShieldAlert,
  History,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Users,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Bell,
  Database,
  Sparkles,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    logout,
    user: storeUser,
    token: storeToken,
    isHydrated,
  } = useAuthStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (storeToken) {
      Cookies.set("access_token", storeToken, {
        expires: 7,
        sameSite: "lax",
        path: "/",
      });
    }
  }, [storeToken]);

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    isFetched: isUserFetched,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: auth.me,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: isHydrated && !!storeToken,
  });

  const currentUser = user || storeUser;

  const { data: notificationsList = [], refetch: refetchNotifications } =
    useQuery({
      queryKey: ["notifications"],
      queryFn: notifications.getAll,
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
      enabled: !!storeToken,
    });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        showNotifications &&
        !target.closest("[data-notification-dropdown]")
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!isMounted || !isHydrated) return;

    if (!storeToken) {
      router.replace("/auth/login");
      return;
    }

    const shouldRedirectToLogin =
      storeToken &&
      !currentUser &&
      !isUserLoading &&
      (isUserError || isUserFetched);

    if (shouldRedirectToLogin) {
      router.replace("/auth/login");
    }
  }, [
    storeToken,
    currentUser,
    router,
    isMounted,
    isHydrated,
    isUserLoading,
    isUserError,
    isUserFetched,
  ]);

  const unreadNotifications = notificationsList.filter((n: any) => !n.isRead);

  const handleMarkAllAsRead = async () => {
    try {
      await notifications.markAllAsRead();
      refetchNotifications();
      setShowNotifications(false);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notifications.markAsRead(notificationId);
      refetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  if (!isMounted || !isHydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground animate-pulse">
          Initializing Protocol...
        </p>
      </div>
    );
  }

  if (!isHydrated || !storeToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground animate-pulse">
          Authenticating...
        </p>
      </div>
    );
  }

  if (storeToken && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground animate-pulse">
          Loading user profile...
        </p>
      </div>
    );
  }

  const userIsAdmin = isAdmin(currentUser);
  const userIsSuperAdmin = isSuperAdmin(currentUser);

  const menuGroups = [
    {
      label: "Intelligence",
      items: [
        {
          id: "panel",
          icon: LayoutDashboard,
          label: "Overview",
          href: "/dashboard",
        },
        {
          id: "search",
          icon: Search,
          label: "Screening Tool",
          href: "/dashboard/search",
        },
        {
          id: "history",
          icon: History,
          label: "Audit History",
          href: "/dashboard/history",
        },
        ...(userIsAdmin
          ? [
              {
                id: "audit",
                icon: ShieldAlert,
                label: "System Logs",
                href: "/dashboard/logs",
              },
            ]
          : []),
      ],
    },
    {
      label: "Management",
      items: [
        ...(userIsAdmin
          ? [
              {
                id: "settings",
                icon: Settings,
                label: "System Config",
                href: "/dashboard/settings",
              },
            ]
          : []),
      ],
    },
    ...(userIsAdmin
      ? [
          {
            label: "Administration",
            items: [
              ...(userIsSuperAdmin
                ? [
                    {
                      id: "overseer",
                      icon: Sparkles,
                      label: "System Overseer",
                      href: "/dashboard/admin",
                    },
                  ]
                : []),
              {
                id: "sync",
                icon: Database,
                label: "Database Sync",
                href: "/dashboard/admin/sync",
              },
              ...(userIsSuperAdmin
                ? [
                    {
                      id: "users",
                      icon: Users,
                      label: "Global Team",
                      href: "/dashboard/admin/users",
                    },
                  ]
                : []),
              ...(userIsAdmin && !userIsSuperAdmin
                ? [
                    {
                      id: "team",
                      icon: Users,
                      label: "Team Management",
                      href: "/dashboard/admin/users",
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ].filter((group) => group.items.length > 0);

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    const segment = pathname.split("/").pop() || "";
    return (
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    );
  };

  const orgName =
    currentUser?.organization?.name || currentUser?.org?.name || "Organization";

  return (
    <div className="h-dvh bg-background flex overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Hamburger Button */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Close Button */}
      {isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed top-4 right-4 z-[60] p-2.5 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:h-full flex flex-col shrink-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 w-full"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="bg-primary p-2 rounded-md">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base text-foreground tracking-tight">
                Sanctions<span className="text-primary">Guard</span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground leading-none mt-0.5">
                Compliance console
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-slate-100 hover:text-foreground font-medium",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border shrink-0">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-emerald-800">
                System online
              </span>
              <span className="text-[11px] text-emerald-700/80">
                Screening available
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 pb-4 shrink-0">
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative bg-background">
        <header
          className={cn(
            "sticky top-0 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 border-b border-border bg-background/95 backdrop-blur-md",
            scrolled && "shadow-sm",
          )}
        >
          <div className="flex flex-col min-w-0 pl-10 lg:pl-0">
            <h2 className="text-lg font-semibold tracking-tight truncate bg-gradient-to-r from-slate-900 via-slate-700 to-blue-700 bg-clip-text text-transparent">
              {getPageTitle()}
            </h2>
            <span className="text-xs text-muted-foreground">
              Secure session
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative" data-notification-dropdown>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-muted-foreground hover:bg-slate-100 hover:text-foreground rounded-md transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm">
                        Notifications
                      </h3>
                      {unreadNotifications.length > 0 && (
                        <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {unreadNotifications.length} new
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsList.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">
                          No new notifications
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          You're all caught up!
                        </p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {notificationsList.map(
                          (notification: any, index: number) => (
                            <div
                              key={notification.id || index}
                              className="p-4 hover:bg-muted/50 rounded-2xl transition-colors border-b border-border/30 last:border-0 cursor-pointer"
                              onClick={() =>
                                !notification.isRead &&
                                handleMarkAsRead(notification.id)
                              }
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-2 shrink-0",
                                    notification.type === "error"
                                      ? "bg-destructive"
                                      : notification.type === "warning"
                                        ? "bg-amber-500"
                                        : notification.type === "success"
                                          ? "bg-emerald-500"
                                          : "bg-primary",
                                    notification.isRead && "opacity-50",
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm font-bold leading-tight",
                                      notification.isRead
                                        ? "text-muted-foreground"
                                        : "text-foreground",
                                    )}
                                  >
                                    {notification.title ||
                                      "System Notification"}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {notification.message ||
                                      "No message available"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-widest font-black">
                                    {notification.createdAt
                                      ? formatDate(notification.createdAt)
                                      : "Just now"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {unreadNotifications.length > 0 && (
                    <div className="p-4 border-t border-border/50">
                      <button
                        onClick={handleMarkAllAsRead}
                        className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/70 transition-colors py-2"
                      >
                        Mark All as Read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="hidden sm:flex items-center gap-3 border border-border px-3 py-1.5 rounded-md">
              <div className="flex flex-col items-end min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {currentUser?.name?.split(" ")[0] || "User"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {orgName}
                  </span>
                  <span className="text-[10px] font-medium text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                    {currentUser?.role === "SUPER_ADMIN"
                      ? "SUPER"
                      : currentUser?.role === "ADMIN"
                        ? "ADMIN"
                        : "USER"}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
