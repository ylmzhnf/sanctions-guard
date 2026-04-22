"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState(""); 
  const [orgName, setOrgName] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { token, setAuth } = useAuthStore();

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);

  const validateForm = () => {
    if (!email.trim() || !name.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/register", {
        email,
        password,
        name,
        orgName,
      });
      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Email may already be in use.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (token) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 font-sans selection:bg-primary/30">
      <div className="bg-card p-10 rounded-[32px] border border-border shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Join <span className="text-primary">SanctionsGuard</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 text-center">
            Automated screening for global compliance
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted-foreground text-xs font-medium mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary transition"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-muted-foreground text-xs font-medium mb-1.5 ml-1">
                Company
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary transition"
                placeholder="Acme Ltd"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground text-xs font-medium mb-1.5 ml-1">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary transition"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-muted-foreground text-xs font-medium mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary transition"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-muted-foreground text-xs font-medium mb-1.5 ml-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create account"
            )}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-primary hover:underline font-semibold"
          >
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
