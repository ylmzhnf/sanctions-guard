"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Globe,
  ShieldAlert,
  Fingerprint,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

export default function HomePage() {
  const { token } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-primary p-1.5 rounded-md">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-foreground">
              Sanctions<span className="text-primary">Guard</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {token ? (
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
              >
                Open Console <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors hidden sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-36 pb-20 md:pt-44 md:pb-28 text-center flex flex-col items-center">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md mb-8">
          Real-time screening against 50,000+ entities
        </p>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.15] mb-6">
          Stop doing sanctions
          <br />
          <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-slate-600 bg-clip-text text-transparent">
            checks manually
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Screen any entity against OFAC, EU, and UN lists in milliseconds.
          AI-powered risk explanations. Immutable audit trail for regulators.
        </p>

        <Link
          href={token ? "/dashboard" : "/auth/register"}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-3 rounded-md text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
        >
          {token ? "Open Workspace" : "Get Started"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              icon: <Globe className="w-5 h-5 text-blue-600" />,
              title: "Fuzzy Matching",
              desc: 'Catches transliterations and typos. "Abramovich" vs "Abramovitz" — high-precision matching.',
            },
            {
              icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
              title: "AI Risk Reports",
              desc: "Each match includes an AI-generated explanation of risk factors and recommended next steps.",
            },
            {
              icon: <Fingerprint className="w-5 h-5 text-emerald-600" />,
              title: "Immutable Audit Log",
              desc: "Every query is HMAC-signed and append-only for regulatory evidence.",
            },
          ].map((f, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-lg p-6 md:p-8"
            >
              <div className="mb-5 bg-slate-100 w-fit p-3 rounded-md border border-slate-200">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2 tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12 md:py-16 border-y border-border my-8">
        <p className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide mb-8">
          Automatically synced from official global sources
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {["OFAC SDN", "EU Consolidated", "UN Security Council", "UK OFSI"].map(
            (source) => (
              <span
                key={source}
                className="text-sm md:text-base font-semibold tracking-tight text-slate-600"
              >
                {source}
              </span>
            ),
          )}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground tracking-tight">
              Sanctions<span className="text-primary">Guard</span>
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} SanctionsGuard — Not legal advice
          </span>
        </div>
      </footer>
    </main>
  );
}
