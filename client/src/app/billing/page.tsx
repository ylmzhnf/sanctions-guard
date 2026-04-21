"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { billing, ApiError } from "@/lib/api"; 
import api from "@/lib/api"; // AppSumo için standart axios/api instance
import { CheckCircle2, Zap, CreditCard, Gift, Loader2, ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise (Lifetime)",
};

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    queries: "10 queries/month",
    features: ["OFAC + EU + UN lists", "Basic risk score", "Audit log", "Email support"],
    priceId: null,
    cta: "Current plan",
    highlight: false,
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "$99",
    period: "/month",
    queries: "500 queries/month",
    features: [
      "Everything in Free",
      "AI risk explanations",
      "PDF report export",
      "API access",
      "Priority email support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "price_starter",
    cta: "Upgrade to Starter",
    highlight: true,
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "$499",
    period: "/month",
    queries: "Unlimited queries",
    features: [
      "Everything in Starter",
      "Custom list upload",
      "Bulk screening API",
      "SLA guarantee",
      "Dedicated support",
      "Team members",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "price_business",
    cta: "Upgrade to Business",
    highlight: false,
  },
];

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  
  // States
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  
  // AppSumo States
  const [appSumoCode, setAppSumoCode] = useState("");
  const [appSumoLoading, setAppSumoLoading] = useState(false);
  const [appSumoMessage, setAppSumoMessage] = useState({ type: "", text: "" });

  const currentPlan = user?.org?.plan || user?.organization?.plan || "FREE";
  const queriesUsed = user?.org?.queriesUsed || user?.organization?.queriesUsed || 0;
  const queriesLimit = user?.org?.queriesLimit || user?.organization?.queriesLimit || 10;
  const isLifetime = user?.org?.isLifetime || user?.organization?.isLifetime;

  // Checkout İşlemi
  async function handleUpgrade(priceId: string) {
    setLoading(priceId);
    setError("");
    try {
      const res = await billing.checkout(priceId);
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  }

  // Portal İşlemi
  async function handlePortal() {
    setLoading("portal");
    setError("");
    try {
      const res = await billing.portal();
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open billing portal");
    } finally {
      setLoading(null);
    }
  }

  // AppSumo Redeem İşlemi
  const handleAppSumoRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appSumoCode.trim()) return;

    setAppSumoLoading(true);
    setAppSumoMessage({ type: "", text: "" });

    try {
      await api.post("/billing/appsumo/redeem", { code: appSumoCode });
      setAppSumoMessage({ type: "success", text: "AppSumo code redeemed successfully! Lifetime access unlocked." });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setAppSumoMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Invalid or expired AppSumo code." 
      });
    } finally {
      setAppSumoLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            You are on the <strong className="text-foreground">{PLAN_LABELS[currentPlan] || currentPlan}</strong> plan.{" "}
            <span className="text-primary font-medium">{queriesUsed}</span> of {isLifetime ? '∞' : queriesLimit} queries used this month.
          </p>
        </div>
        
        {currentPlan !== "FREE" && !isLifetime && (
          <button
            onClick={handlePortal}
            disabled={loading === "portal"}
            className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground text-sm font-bold rounded-xl transition hover:bg-muted border border-border shadow-sm"
          >
            {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading === "portal" ? "Opening..." : "Billing Portal"}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 animate-shake">
          {error}
        </div>
      )}

      {isLifetime && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 shadow-lg">
          <div className="bg-emerald-500/20 p-4 rounded-full">
            <Gift className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
              Lifetime Enterprise Access <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              You are currently on an AppSumo Lifetime deal. You have unlimited access. No further billing is required.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key && !isLifetime;
          
          return (
            <div
              key={plan.key}
              className={clsx(
                "relative flex flex-col bg-card rounded-3xl p-8 border transition-all duration-300",
                plan.highlight && !isCurrent ? "border-primary ring-1 ring-primary shadow-xl shadow-primary/10 scale-[1.02]" : "border-border shadow-lg",
                isCurrent && "border-emerald-500 ring-1 ring-emerald-500 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]"
              )}
            >
              {plan.highlight && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold shadow-md">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                    ✓ Current
                  </Badge>
                </div>
              )}

              <h2 className="text-xl font-bold text-foreground mb-1">{plan.name}</h2>
              <div className="mt-2 mb-2 flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm font-medium">{plan.period}</span>
              </div>
              <p className="text-sm text-primary font-bold mb-6">{plan.queries}</p>

              <ul className="space-y-4 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-foreground flex items-start gap-3">
                    <CheckCircle2 className={clsx("w-5 h-5 shrink-0 mt-0.5", plan.highlight ? "text-primary" : "text-emerald-500")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent || isLifetime ? (
                <div className="w-full py-3.5 rounded-xl font-bold text-center text-sm bg-secondary text-secondary-foreground opacity-60 cursor-default">
                  {isLifetime ? "Included in Lifetime" : "Active Plan"}
                </div>
              ) : plan.priceId ? (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={!!loading}
                  className={clsx(
                    "w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm",
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-muted border border-border"
                  )}
                >
                  {loading === plan.priceId ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.cta}
                  {loading !== plan.priceId && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-full py-3.5 rounded-xl font-bold text-center text-sm bg-secondary text-secondary-foreground opacity-60 cursor-default">
                  {plan.cta}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-secondary p-3 rounded-xl border border-border">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Enterprise</h3>
            <p className="text-muted-foreground text-sm mt-1">
              On-premise deployment, custom sanctions lists, SLA guarantee, and a dedicated CSM.
            </p>
          </div>
        </div>
        <a
          href="mailto:sales@sanctions-guard.com?subject=Enterprise%20Inquiry"
          className="shrink-0 px-6 py-3 bg-secondary text-secondary-foreground hover:bg-muted border border-border rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
        >
          Contact sales <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {!isLifetime && (
        <div className="mt-8 bg-card border border-border rounded-3xl p-8 shadow-lg max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Have an AppSumo Code?</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Redeem your AppSumo license key below to unlock Lifetime Enterprise access immediately.
          </p>

          <form onSubmit={handleAppSumoRedeem} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="text"
              placeholder="e.g. AS-XXXX-YYYY"
              value={appSumoCode}
              onChange={(e) => setAppSumoCode(e.target.value)}
              disabled={appSumoLoading}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase transition-all placeholder:normal-case"
            />
            <button
              type="submit"
              disabled={!appSumoCode || appSumoLoading}
              className="px-8 py-3 bg-foreground text-background font-bold rounded-xl transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {appSumoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Redeem Code"}
            </button>
          </form>

          {appSumoMessage.text && (
            <div className={clsx(
              "mt-4 text-sm font-medium p-3 rounded-xl inline-block border",
              appSumoMessage.type === 'success' 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-destructive/10 text-destructive border-destructive/20 animate-shake"
            )}>
              {appSumoMessage.text}
            </div>
          )}
        </div>
      )}

    </div>
  );
}