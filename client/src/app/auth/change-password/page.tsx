"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

import api, { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: false });
  
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (password.length < 8) {
      return setStatus({ loading: false, error: "Password must be at least 8 characters.", success: false });
    }
    if (password !== confirm) {
      return setStatus({ loading: false, error: "Passwords do not match.", success: false });
    }

    setStatus({ loading: true, error: "", success: false });

    try {
      
      await api.patch("/auth/change-password", { password });
      
      setStatus({ loading: false, error: "", success: true });
      
      
      setTimeout(() => {
        logout();
        router.push("/auth/login?changed=true");
      }, 2000); 
    } catch (err: any) {
      setStatus({ 
        loading: false, 
        error: err instanceof ApiError ? err.message : "Password could not be updated. Please contact security admin.", 
        success: false 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans selection:bg-primary/30">
      <div className="bg-card border border-border p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-primary/10 p-4 rounded-2xl mb-4 border border-primary/20">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tighter italic">
            Set New <span className="text-primary not-italic">Password</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-3 font-medium leading-relaxed">
            For your security, you must replace your temporary password before accessing the compliance engine.
          </p>
        </div>

        {status.error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive flex items-center gap-3 animate-in shake-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {status.error}
          </div>
        )}

        {status.success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 flex items-center gap-3 animate-in zoom-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Password updated. Redirecting to secure gateway...
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
              New Password
            </label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status.loading || status.success}
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm focus:border-primary transition-all outline-none font-medium"
              placeholder="Min 8 characters"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
              Confirm Password
            </label>
            <input 
              type="password" 
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={status.loading || status.success}
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-sm focus:border-primary transition-all outline-none font-medium"
              placeholder="Repeat new password"
            />
          </div>

          <button 
            type="submit"
            disabled={status.loading || status.success}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-primary/20 mt-4"
          >
            {status.loading ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : status.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {status.loading ? "Updating Credentials..." : status.success ? "Verified" : "Update Password"}
          </button>
        </form>

        <div className="mt-8 p-5 bg-muted/30 border border-border/50 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tighter">
            Your old temporary password will become invalid immediately. You will be redirected to the sign-in page to verify your new identity.
          </p>
        </div>
      </div>
    </div>
  );
}