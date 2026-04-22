"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import {
  Users,
  Loader2,
  ChevronDown,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

type UserData = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
};

export default function TeamManagementPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });
  const [error, setError] = useState("");

  const { data: dbUsers = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["org-users"],
    queryFn: async () => {
      const response = await api.get("/users/org-members");
      return response.data;
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/users/${userId}/role`, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-users"] }),
    onError: () => alert("Failed to update role."),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof newMember) => {
      const res = await api.post("/users/org-members", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      setIsModalOpen(false);
      setNewMember({ name: "", email: "", password: "", role: "USER" });
      setError("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to add member.");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email || !newMember.password) {
      setError("Email and password are required.");
      return;
    }
    addMemberMutation.mutate(newMember);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization's users and access levels.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 hover:opacity-90"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
            {dbUsers.length} Active Members
          </Badge>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-6">Member</th>
              <th className="p-6">Access Level</th>
              <th className="p-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="p-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : (
              dbUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-6">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      {u.name || "Unnamed User"}
                      {u.id === currentUser?.id && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="p-6">
                    <div className="relative inline-block w-32">
                      <select
                        disabled={
                          u.id === currentUser?.id || roleMutation.isPending
                        }
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            userId: u.id,
                            role: e.target.value,
                          })
                        }
                        className="w-full appearance-none bg-background border border-border text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 font-bold"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="USER">USER</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE
                    </div>
                  </td>
                </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Add New Member
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {error && (
                <div className="text-xs font-bold text-destructive bg-destructive/10 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm"
                  placeholder="Enter a temporary password"
                />{" "}
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Access Role
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({ ...newMember, role: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-bold"
                >
                  <option value="USER">USER (Cannot change settings)</option>
                  <option value="ADMIN">ADMIN (Full access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold mt-4"
              >
                {addMemberMutation.isPending ? "Adding..." : "Invite Member"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
