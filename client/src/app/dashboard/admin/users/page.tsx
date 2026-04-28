"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Loader2, ChevronDown, ShieldCheck, UserPlus, X, AlertTriangle, Search, Mail, User, Shield
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrgUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export default function TeamManagementPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "", role: "USER" });

  const { data: dbUsers = [], isLoading } = useQuery<OrgUser[]>({
    queryKey: ["org-users"],
    queryFn: async () => {
      const response = await api.get("/users/org-members");
      return response.data;
    },
  });

  const filteredUsers = useMemo(() => {
    return dbUsers.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dbUsers, searchTerm]);

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/users/${userId}/role`, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-users"] }),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof newMember) => {
      return (await api.post("/users/org-members", data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      setIsModalOpen(false);
      setNewMember({ name: "", email: "", password: "", role: "USER" });
      setError("");
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to send invitation."),
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
             <Shield className="w-4 h-4" /> Organization Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Global <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Team</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg leading-relaxed">
            Manage your organization's members, assign security clearances, and monitor team access levels.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* ── SEARCH & STATS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search team members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm hover:shadow-md transition-all"
          />
        </div>
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl flex items-center justify-between p-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Members</p>
            <p className="text-3xl font-black tracking-tighter leading-none">{dbUsers.length}</p>
          </div>
        </div>
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      <div className="bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-separate border-spacing-y-2 px-2">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Security Clearance</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="bg-background/40 hover:bg-muted/50 transition-all group shadow-sm hover:shadow-md rounded-2xl">
                  <td className="px-6 py-5 rounded-l-2xl">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-sm border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
                        {u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-foreground flex items-center gap-3 text-sm group-hover:text-primary transition-colors">
                          {u.name || "Unnamed Agent"}
                          {u.id === currentUser?.id && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">You</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="relative inline-block">
                      <select
                        disabled={u.id === currentUser?.id || roleMutation.isPending}
                        value={u.role}
                        onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        className="appearance-none bg-card border border-border/50 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl pl-5 pr-12 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40 cursor-pointer shadow-sm hover:border-primary/50 transition-all"
                      >
                        <option value="ADMIN">Workspace Admin</option>
                        <option value="USER">Standard User</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right rounded-r-2xl">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 shadow-sm">
                      <ShieldCheck className="w-4 h-4" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-border/50 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-2xl rounded-full" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-primary" /> Invite Member
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-muted p-2.5 rounded-xl transition-colors bg-background border border-border/50"><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addMemberMutation.mutate(newMember); }} className="space-y-6 relative z-10">
              {error && (
                <div className="text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex items-center gap-3 shadow-inner">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="w-full bg-background border border-border/50 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" placeholder="Agent Name" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" required value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className="w-full bg-background border border-border/50 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" placeholder="agent@company.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">Temporary Password</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" required value={newMember.password} onChange={(e) => setNewMember({ ...newMember, password: e.target.value })} className="w-full bg-background border border-border/50 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" placeholder="System Generated Password" />
                </div>
              </div>

              <button type="submit" disabled={addMemberMutation.isPending} className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center">
                {addMemberMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Dispatch Invitation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}