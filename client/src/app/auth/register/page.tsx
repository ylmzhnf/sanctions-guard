"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { auth, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ 
    email: "", 
    password: "", 
    name: "", 
    orgName: "" 
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: false });

    try {
      await auth.register(form);
      setStatus({ loading: false, error: "", success: true });
      
      
      setTimeout(() => {
        router.push("/auth/login?registered=true");
      }, 2500);
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err instanceof ApiError ? err.message : "Registration failed. Please try again later.",
        success: false
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans selection:bg-primary/30">
      <div className="bg-card p-10 rounded-[2.5rem] border border-border shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-500">
        {}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary p-3.5 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter italic">
            Join <span className="text-primary not-italic">SanctionsGuard</span>
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.25em] mt-2 text-center">
            Start Your Compliance Excellence
          </p>
        </div>

        {}
        {status.error && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-bold text-center">
            {status.error}
          </div>
        )}

        {status.success && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-600 font-bold text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Account created! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-all font-medium"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Organization</label>
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-all font-medium"
                placeholder="Company Inc."
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-all font-medium"
              placeholder="john@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-all font-medium"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={status.loading || status.success}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-xl shadow-primary/20 uppercase tracking-widest mt-4"
          >
            {status.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Create Workspace <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-10 text-center text-xs font-bold text-muted-foreground pt-6 border-t border-border">
          Already verified? <Link href="/auth/login" className="text-primary hover:underline underline-offset-4">Sign In to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}