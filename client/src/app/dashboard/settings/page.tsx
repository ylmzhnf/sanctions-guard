"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import {
  ShieldAlert,
  Settings,
  Key,
  Sliders,
  Users,
  ChevronDown,
  Save,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

type UserData = {
  id: string;
  username: string | null;
  email: string;
  role: "ADMIN" | "USER";
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [threshold, setThreshold] = useState(85);
  const [apiKey, setApiKey] = useState("sk_live_1234567890abcdef");

  const { data: dbUsers = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["org-users"],
    queryFn: async () => {
      const response = await api.get("/users/org-members");
      return response.data;
    },
    enabled: isAdmin,
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/users/${userId}/role`, { role });
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ["org-users"] });
      const previousUsers = queryClient.getQueryData<UserData[]>(["org-users"]);
      queryClient.setQueryData<UserData[]>(["org-users"], (old) =>
        old?.map((u) =>
          u.id === userId ? { ...u, role: role as "ADMIN" | "USER" } : u,
        ),
      );
      return { previousUsers };
    },
    onError: (err, newMeta, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["org-users"], context.previousUsers);
      }
      alert("Failed to update role. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    if (userId === user?.id) {
      alert("Security Protocol: You cannot change your own role directly.");
      return;
    }
    if (
      confirm(`Are you sure you want to change this user's role to ${newRole}?`)
    ) {
      roleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleSaveChanges = async () => {
    alert(
      "System configurations simulated save successfully! (Backend endpoint needed)",
    );
  };

  const handleRegenerateKey = () => {
    setApiKey(
      "sk_live_" +
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10),
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {!isAdmin && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-destructive" />
          <div className="flex-1">
            <p className="font-bold text-destructive text-sm uppercase tracking-wider">
              View-Only Mode
            </p>
            <p className="text-destructive/80 text-xs mt-0.5">
              You are logged in as a standard USER. Administrator privileges are
              required to modify system settings or manage users.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Administration Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.organization?.name
              ? `Managing ${user.organization.name}`
              : "Configure core engine parameters and manage system access"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-foreground uppercase text-xs tracking-widest">
              System Configurations
            </h2>
          </div>

          <div className="p-6 space-y-8">
            <div>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Fuzzy Match Threshold
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Minimum structural similarity score for hit detection
                  </p>
                </div>
                <span className="text-primary font-bold bg-primary/10 px-2 py-1 rounded text-sm">
                  {threshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                disabled={!isAdmin}
                className={`w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer ${!isAdmin ? "opacity-50 cursor-not-allowed" : "accent-primary"}`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-medium uppercase">
                <span>Loose (50%)</span>
                <span>Strict (100%)</span>
              </div>
            </div>

            <div className="h-px bg-border"></div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      External API Key
                    </h3>
                    <Badge
                      variant="warning"
                      className="text-[9px] uppercase px-1.5 py-0"
                    >
                      Secret
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for programmatic access to the screening engine
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground text-sm outline-none"
                    readOnly
                  />
                </div>
                <button
                  onClick={handleRegenerateKey}
                  disabled={!isAdmin}
                  className={`px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg border border-border transition-colors ${isAdmin ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"}`}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={!isAdmin}
                className={`flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg transition-all ${isAdmin ? "hover:opacity-90 shadow-md" : "opacity-50 cursor-not-allowed"}`}
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-bold text-foreground uppercase text-xs tracking-widest">
                User Management
              </h2>
            </div>
            <Badge
              variant="default"
              className="text-[10px] bg-primary/10 text-primary"
            >
              {dbUsers.length} Users
            </Badge>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && isAdmin ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Loading users...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : isAdmin ? (
                  dbUsers.map((mu) => (
                    <tr
                      key={mu.id}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {mu.username || "Unnamed User"}
                          {mu.id === user?.id && (
                            <Badge
                              variant="default"
                              className="text-[9px] bg-primary/20 text-primary border-primary/30"
                            >
                              Current Administrator
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {mu.email}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="relative group inline-block w-full max-w-[140px]">
                          <select
                            disabled={
                              !isAdmin ||
                              mu.id === user?.id ||
                              roleMutation.isPending
                            }
                            value={mu.role}
                            onChange={(e) =>
                              handleRoleChange(mu.id, e.target.value)
                            }
                            className={`w-full appearance-none bg-background border border-border text-xs text-foreground rounded px-3 py-1.5 outline-none ${isAdmin && mu.id !== user?.id ? "cursor-pointer hover:border-muted-foreground focus:border-primary" : "opacity-50 cursor-not-allowed bg-muted/50"}`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="USER">USER</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className="text-[9px] px-2 py-0.5"
                          variant="default"
                        >
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Key className="w-8 h-8 opacity-20 text-destructive" />
                        <p>
                          System locked. You do not have permission to view or
                          manage users.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
