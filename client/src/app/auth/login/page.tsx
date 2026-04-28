"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Loader2, ArrowRight, Lock } from "lucide-react";
import { auth, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      const res = await auth.login(form);
      setAuth(res.user, res.token);
      router.push("/dashboard");
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err instanceof ApiError ? err.message : "Authentication failed. Please check your credentials." 
      });
    }
  };

  return (
    <div className="bg-card p-10 rounded-[2.5rem] border border-border shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      {}
      <div className="flex flex-col items-center mb-10">
        <div className="bg-primary p-3.5 rounded-2xl mb-4 shadow-lg shadow-primary/20 transition-transform hover:rotate-6">
          <ShieldAlert className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tighter italic">
          Sanctions<span className="text-primary not-italic">Guard</span>
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.25em] mt-2">
          Secure Access Gateway
        </p>
      </div>

      {}
      {status.error && (
        <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-bold text-center flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" /> {status.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
          <input
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm outline-none focus:border-primary transition-all font-medium"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm outline-none focus:border-primary transition-all font-medium"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button
          type="submit"
          disabled={status.loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-xl shadow-primary/20 uppercase tracking-widest mt-2"
        >
          {status.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>Sign In <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {}
      <div className="mt-10 flex flex-col gap-4 text-center text-xs font-bold text-muted-foreground">
        <div className="pt-6 border-t border-border">
          New to the platform?{" "}
          <Link href="/auth/register" className="text-primary hover:underline underline-offset-4">
            Create an Account
          </Link>
        </div>
        <Link href="/support" className="hover:text-foreground transition-colors opacity-60">
          Contact Security Support
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans selection:bg-primary/30">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}