"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store";
import {
  CheckCircle2, CreditCard, Gift, Loader2, ArrowRight,
  Building2, AlertTriangle, Zap, Shield, Rocket, Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { billing, ApiError } from "@/lib/api";
import { PLAN_LABELS } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    queries: "10 queries / month",
    description: "Get started with basic sanctions screening.",
    icon: Shield,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
    features: [
      "OFAC + EU + UN lists",
      "Basic risk score",
      "Immutable audit logs",
      "Email support",
    ],
    priceId: null,
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "$99",
    period: "/month",
    queries: "500 queries / month",
    description: "Perfect for growing compliance teams.",
    icon: Rocket,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    features: [
      "Everything in Free",
      "AI risk explanations",
      "PDF report export",
      "Full API access",
      "Priority email support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "price_starter",
    highlight: true,
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "$499",
    period: "/month",
    queries: "10,000 queries / month",
    description: "Built for enterprise-grade compliance workflows.",
    icon: Star,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    features: [
      "Everything in Starter",
      "Custom list upload",
      "Bulk screening API",
      "SLA guarantee",
      "Dedicated CSM",
      "Unlimited team members",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "price_business",
  },
];

export default function BillingPage() {
  const storeUser = useAuthStore((s) => s.user);
  const { isSaas, allFeaturesUnlocked } = useFeatureFlags();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const org = storeUser?.org;
  const currentPlan = org?.plan || "FREE";
  const queriesUsed = org?.queriesUsed || 0;
  const queriesLimit = org?.queriesLimit || 10;
  const isUnlimited = org?.isUnlimited || ["ENTERPRISE", "SELF_HOSTED"].includes(currentPlan);

  const usagePct = useMemo(() => {
    if (isUnlimited) return 0;
    return Math.min(100, Math.round((queriesUsed / queriesLimit) * 100));
  }, [queriesUsed, queriesLimit, isUnlimited]);

  const handleAction = async (action: "checkout" | "portal", id?: string) => {
    const key = id || action;
    setLoadingId(key);
    setError("");
    try {
      const res = action === "checkout" ? await billing.checkout(id!) : await billing.portal();
      if (res?.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to process ${action}.`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-[1300px] mx-auto space-y-12 animate-in fade-in duration-1000 pb-20 relative font-sans">

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
            <CreditCard className="w-4 h-4" /> Subscription Management
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            Billing <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">&amp; Plans</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-xl leading-relaxed">
            Manage your subscription, monitor monthly usage, and upgrade when your screening needs grow.
          </p>
        </div>

        {currentPlan !== "FREE" && !isUnlimited && (
          <button
            onClick={() => handleAction("portal")}
            disabled={!!loadingId}
            className="bg-card/60 backdrop-blur-xl text-foreground hover:bg-muted border border-border/50 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {loadingId === "portal"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CreditCard className="w-4 h-4 text-primary" />}
            Manage Subscription
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold rounded-2xl px-6 py-4 flex items-center gap-3 relative z-10">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[3rem] p-10 shadow-2xl flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

        {isUnlimited ? (
          <div className="flex items-center gap-6 flex-1 relative z-10">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-3xl border border-primary/20 shadow-inner">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black tracking-tight">Enterprise License</h2>
                <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]">UNLIMITED</Badge>
              </div>
              <p className="text-muted-foreground text-sm font-medium max-w-lg leading-relaxed">
                Your organization holds a private license with unlimited queries and full API access. No Stripe billing required.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative z-10 w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">Current Plan</p>
                <h2 className="text-2xl font-black tracking-tight">{PLAN_LABELS[currentPlan as keyof typeof PLAN_LABELS] || currentPlan}</h2>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-3xl font-black tracking-tighter text-foreground">{queriesUsed.toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Used</p>
                </div>
                <div className="w-px bg-border/50" />
                <div>
                  <p className="text-3xl font-black tracking-tighter text-foreground">{queriesLimit.toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Limit</p>
                </div>
                <div className="w-px bg-border/50" />
                <div>
                  <p className={cn("text-3xl font-black tracking-tighter", usagePct > 90 ? "text-destructive" : "text-emerald-500")}>{usagePct}%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consumed</p>
                </div>
              </div>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-1000 ease-out", usagePct > 90 ? "bg-destructive" : usagePct > 70 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {usagePct > 80 && (
              <p className="text-[11px] font-black text-amber-500 mt-3 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Approaching limit — consider upgrading
              </p>
            )}
          </div>
        )}
      </div>

      {!isUnlimited && (
        <div className="relative z-10">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Choose Your Plan</p>
            <h2 className="text-3xl font-black tracking-tighter">Scale As You Grow</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {PLANS.map((plan, idx) => {
              const isCurrent = currentPlan === plan.key;
              const PlanIcon = plan.icon;
              return (
                <div
                  key={plan.key}
                  className={cn(
                    "relative flex flex-col bg-card/60 backdrop-blur-xl rounded-[2.5rem] p-10 border transition-all duration-500 hover:shadow-xl group overflow-visible",
                    plan.highlight && !isCurrent
                      ? "border-primary/40 shadow-2xl shadow-primary/15 ring-1 ring-primary/20"
                      : "border-border/50 shadow-sm hover:border-primary/30",
                    isCurrent && "border-primary/30 bg-primary/5"
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-px left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500" />
                  )}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

                  {plan.highlight && !isCurrent && (
                    <div className="absolute -top-5 left-0 right-0 flex justify-center">
                      <span className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 pointer-events-none">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className={cn("p-4 rounded-2xl w-fit mb-5 border border-border/50 shadow-inner", plan.iconBg)}>
                    <PlanIcon className={cn("w-6 h-6", plan.iconColor)} />
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{plan.description}</p>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-4">{plan.name}</h2>
                  
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                    <span className="text-muted-foreground text-[11px] font-black uppercase tracking-widest">{plan.period}</span>
                  </div>
                  <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-8">{plan.queries}</p>

                  <ul className="space-y-4 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="text-sm text-foreground/80 font-medium flex items-start gap-3">
                        <div className="p-0.5 rounded-md bg-primary/10 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-center bg-primary/10 text-primary border border-primary/20">
                      Current Plan
                    </div>
                  ) : plan.priceId ? (
                    <button
                      onClick={() => handleAction("checkout", plan.priceId!)}
                      disabled={!!loadingId}
                      className={cn(
                        "w-full py-5 px-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-50 text-[11px] shadow-xl active:scale-95",
                        plan.highlight
                          ? "bg-primary text-primary-foreground hover:scale-[1.02] shadow-primary/20 hover:shadow-[0_0_30px_rgba(var(--primary),0.3)]"
                          : "bg-foreground text-background hover:bg-foreground/90"
                      )}
                    >
                      {loadingId === plan.priceId
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><span>Upgrade Now</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  ) : (
                    <div className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-center bg-muted/50 text-muted-foreground border border-border/50">
                      Start for Free
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative z-10 border border-dashed border-primary/20 bg-card/40 backdrop-blur-xl rounded-[2.5rem] p-10 flex flex-col lg:flex-row items-center justify-between gap-8 hover:border-primary/40 transition-colors group overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-5 rounded-3xl border border-primary/20 shrink-0 shadow-inner">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Custom Deployment</p>
            <h3 className="font-black text-foreground text-xl tracking-tighter uppercase italic">Enterprise &amp; On-Premise</h3>
            <p className="text-muted-foreground text-sm font-medium mt-1 leading-relaxed max-w-lg">
              Need a private cloud deployment, custom API limits, VPC peering, or dedicated infrastructure? Our sales team is ready.
            </p>
          </div>
        </div>
        <a
          href="mailto:sales@sanctions-guard.com?subject=Enterprise%20Inquiry"
          className="shrink-0 px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 relative z-10"
        >
          Contact Sales <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}