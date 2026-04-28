"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, ArrowRight, Check, Globe, 
  ShieldAlert, Fingerprint, Lock 
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { token } = useAuthStore();
  const { isEnterprise } = useFeatureFlags();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Hydration hatasını önlemek için client-side mount beklenir
  if (!isMounted) return <div className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col">
      
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/60 backdrop-blur-xl px-6 py-4 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20 transition-transform group-hover:rotate-6">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-black text-xl tracking-tighter italic">
              Sanctions<span className="text-primary not-italic">Guard</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {token ? (
              <Link
                href="/dashboard"
                className="bg-primary text-primary-foreground hover:opacity-90 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
              >
                Console <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link href="/auth/register" className="bg-primary text-primary-foreground hover:opacity-90 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5">
                  {isEnterprise ? "Request Access" : "Start for free"}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-40 pb-20 md:py-40 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-4 py-1.5 rounded-full mb-8 shadow-sm uppercase tracking-[0.2em]">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          {isEnterprise ? "Enterprise Compliance Node Active" : "Real-time screening against 50,000+ entities"}
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-8">
          Stop doing sanctions
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">checks manually</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          {isEnterprise 
            ? "Deploy our high-precision screening engine on your private infrastructure. Fully air-gapped ready with immutable audit trails."
            : "Screen any entity against OFAC, EU, and UN lists in milliseconds. AI-powered risk explanations. Immutable audit trail for regulators."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href={token ? "/dashboard" : "/auth/register"}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:-translate-y-1 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
          >
            {token ? "Open Workspace" : (isEnterprise ? "Request Deployment" : "Start for free")} 
            <ArrowRight className="w-4 h-4" />
          </Link>
          {!token && !isEnterprise && (
            <Link
              href="#pricing"
              className="w-full sm:w-auto bg-secondary text-foreground hover:bg-muted px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-colors border border-border"
            >
              See pricing
            </Link>
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Globe className="w-8 h-8 text-blue-500" />, title: "Fuzzy Matching", desc: 'Catches transliterations and typos. "Abramovich" vs "Abramovitz" — we catch it all with high precision.' },
            { icon: <ShieldAlert className="w-8 h-8 text-orange-500" />, title: "AI Risk Reports", desc: "Each match comes with an AI-generated explanation of why it is risky and what exact steps to take next." },
            { icon: <Fingerprint className="w-8 h-8 text-emerald-500" />, title: "Immutable Audit Log", desc: "Every query is HMAC-signed and append-only. Prove to regulators you did your job with 100% integrity." },
          ].map((f, idx) => (
            <div key={idx} className="bg-card text-card-foreground border border-border rounded-[2.5rem] p-8 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all group cursor-default">
              <div className="mb-6 bg-muted w-fit p-4 rounded-2xl group-hover:scale-110 transition-transform origin-left">{f.icon}</div>
              <h3 className="font-black text-xl mb-3 tracking-tight">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Watchlists Banner ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-y border-border/50 bg-muted/10 my-10 rounded-[3rem]">
        <p className="text-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] mb-8">
          Automatically synced from official global sources
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {["OFAC SDN", "EU Consolidated", "UN Security Council", "UK OFSI"].map((source) => (
            <span key={source} className="text-lg md:text-2xl font-black tracking-tighter text-foreground cursor-default italic">
              {source}
            </span>
          ))}
        </div>
      </section>

      {/* ── Hybrid Pricing / Enterprise Contact ──────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-32">
        {isEnterprise ? (
          <div className="bg-card border border-primary/20 rounded-[3rem] p-12 flex flex-col md:flex-row items-center gap-12 shadow-2xl">
            <div className="flex-1">
              <h2 className="text-4xl font-black mb-6 tracking-tight italic">Enterprise <span className="text-primary not-italic">On-Premise</span></h2>
              <p className="text-muted-foreground mb-8 font-medium leading-relaxed max-w-xl">
                Keep your highly sensitive data entirely within your network. SanctionsGuard Enterprise provides the exact same powerful screening engine, packaged as a self-hosted Docker cluster.
              </p>
              <ul className="space-y-4">
                {["Private Isolated Database", "Active Directory & SSO Integration", "Unlimited API Rate Limits", "24/7 Dedicated Support"].map(item => (
                  <li key={item} className="flex items-center gap-3 font-bold text-sm">
                    <Check className="text-primary w-5 h-5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full md:w-1/3 bg-muted/50 border border-border rounded-3xl p-8 flex flex-col items-center text-center">
              <Lock className="w-12 h-12 mb-4 text-primary" />
              <h4 className="font-black text-lg mb-2 tracking-tight">Maximum Security</h4>
              <p className="text-xs text-muted-foreground mb-8 font-medium">Designed exclusively for Financial Institutions & Gov Agencies</p>
              <button className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black mb-4 tracking-tight">Simple, transparent pricing</h2>
              <p className="text-muted-foreground font-medium">Choose the plan that fits your screening volume. No hidden fees.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {[
                { name: "Free", price: "$0", queries: "10 queries/mo", features: ["OFAC + EU + UN lists", "Basic risk score", "Audit log"], cta: "Get started", highlight: false },
                { name: "Starter", price: "$99", queries: "500 queries/mo", features: ["Everything in Free", "AI risk explanations", "PDF reports", "API access"], cta: "Start Starter", highlight: true },
                { name: "Business", price: "$499", queries: "Unlimited queries", features: ["Everything in Starter", "Priority support", "Custom list upload", "SLA guarantee"], cta: "Start Business", highlight: false },
              ].map((plan) => (
                <div key={plan.name} className={cn(
                  "relative rounded-[2.5rem] p-8 border transition-all duration-300 flex flex-col min-h-[460px]",
                  plan.highlight ? "bg-card text-card-foreground border-primary shadow-2xl shadow-primary/10 scale-100 md:scale-105 z-10 ring-1 ring-primary" : "bg-muted/5 text-card-foreground border-border hover:bg-card"
                )}>
                  {plan.highlight && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg">
                      Most Popular
                    </span>
                  )}
                  <div className="text-xl font-black mb-2 tracking-tight">{plan.name}</div>
                  <div className="text-4xl font-black mb-1">
                    {plan.price}<span className="text-sm font-medium text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-[11px] text-primary font-black uppercase tracking-widest mb-8">{plan.queries}</div>
                  <ul className="space-y-4 mb-10 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-sm flex items-start gap-3 font-medium">
                        <Check className={cn("w-5 h-5 shrink-0", plan.highlight ? "text-primary" : "text-muted-foreground")} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link 
                    href={token ? "/dashboard/billing" : "/auth/register"} 
                    className={cn(
                      "block text-center py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all mt-auto",
                      plan.highlight ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:-translate-y-1" : "bg-secondary text-secondary-foreground hover:bg-muted border border-border"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-12 bg-card/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-black text-lg text-foreground tracking-tight italic">
              Sanctions<span className="text-primary not-italic">Guard</span>
            </span>
          </div>
          <div className="text-center md:text-left">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest block">
              © {new Date().getFullYear()} Compliance Engine // Not Legal Advice
            </span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">Privacy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}