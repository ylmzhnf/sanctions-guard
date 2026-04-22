"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ShieldAlert, ArrowRight, UserCheck, Loader2 } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (token) {
      const cookieToken = Cookies.get("access_token");
      if (!cookieToken) {
        logout();
      }
      router.replace("/dashboard");
      return;
    }
    const registered = searchParams.get("registered");
    if (registered === "1" || registered === "true") {
      setSuccessMessage("Registration successful! Please log in with your credentials.");
    }
  }, [token, router, searchParams, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 8) {
      setError("Please check your email and password (min 8 chars).");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token: accessToken, user } = response.data;
      
      if (accessToken && user) {
        setAuth(user, accessToken);

        if (user.mustChangePassword) {
          router.push("/auth/change-password");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (token) return null;
  
  return (
    <div className="bg-card p-10 rounded-[32px] border border-border shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-primary p-3 rounded-2xl mb-4 shadow-lg shadow-primary/20">
          <ShieldAlert className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Sanctions<span className="text-primary">Guard</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Secure sign-in for compliance teams
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="block text-muted-foreground text-sm font-medium mb-2 ml-1">Work Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label className="block text-muted-foreground text-sm font-medium mb-2 ml-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-md"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        New to the platform?{" "}
        <Link href="/auth/register" className="text-primary hover:underline font-semibold">
          Create account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 font-sans">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-muted-foreground italic">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading gateway...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}