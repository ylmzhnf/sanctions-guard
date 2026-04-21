import Link from "next/link";
import { Shield, ArrowRight, Check } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group cursor-pointer"
          >
            <Shield className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
              SanctionsGuard
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="bg-primary text-primary-foreground hover:opacity-90 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Start for free
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-6 pt-40 pb-20 md:py-40 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-8 shadow-sm">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Real-time screening against 50,000+ sanctioned entities
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
          Stop doing sanctions
          <br />
          <span className="text-primary/90">checks manually</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Screen any entity against OFAC, EU, and UN lists in milliseconds.
          AI-powered risk explanations. Immutable audit trail for regulators.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
          >
            Start for free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#pricing"
            className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-muted px-8 py-4 rounded-xl font-bold text-lg transition-colors border border-border"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "🔍",
              title: "Fuzzy Matching",
              desc: 'Catches transliterations and typos. "Abramovich" vs "Abramovitz" — we catch it all with high precision.',
            },
            {
              icon: "🤖",
              title: "AI Risk Reports",
              desc: "Each match comes with an AI-generated explanation of why it is risky and what exact steps to take next.",
            },
            {
              icon: "🔒",
              title: "Immutable Audit Log",
              desc: "Every query is HMAC-signed and append-only. Prove to regulators you did your job with 100% integrity.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-card text-card-foreground border border-border rounded-3xl p-8 hover:border-primary/50 hover:shadow-xl transition-all group"
            >
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform origin-left">
                {f.icon}
              </div>
              <h3 className="font-bold text-xl mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border/50">
        <p className="text-center text-muted-foreground text-xs font-bold uppercase tracking-widest mb-10">
          Automatically synced from official global sources
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {[
            "OFAC SDN",
            "EU Consolidated",
            "UN Security Council",
            "UK OFSI",
          ].map((source) => (
            <span
              key={source}
              className="text-lg md:text-xl font-black tracking-tighter text-foreground"
            >
              {source}
            </span>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            Choose the plan that fits your screening volume. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {[
            {
              name: "Free",
              price: "$0",
              queries: "10 queries/mo",
              features: [
                "OFAC + EU + UN lists",
                "Basic risk score",
                "Audit log",
              ],
              cta: "Get started",
              highlight: false,
            },
            {
              name: "Starter",
              price: "$99",
              queries: "500 queries/mo",
              features: [
                "Everything in Free",
                "AI risk explanations",
                "PDF reports",
                "API access",
              ],
              cta: "Start Starter",
              highlight: true,
            },
            {
              name: "Business",
              price: "$499",
              queries: "Unlimited queries",
              features: [
                "Everything in Starter",
                "Priority support",
                "Custom list upload",
                "SLA guarantee",
              ],
              cta: "Start Business",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 border transition-all duration-300 ${
                plan.highlight
                  ? "bg-card text-card-foreground border-primary shadow-2xl scale-100 md:scale-105 z-10 ring-1 ring-primary"
                  : "bg-muted/10 text-card-foreground border-border hover:bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                  Most Popular
                </span>
              )}
              <div className="text-xl font-bold mb-2">{plan.name}</div>
              <div className="text-4xl font-bold mb-1">
                {plan.price}
                <span className="text-base font-normal text-muted-foreground">
                  /mo
                </span>
              </div>
              <div className="text-sm text-primary font-bold mb-8">
                {plan.queries}
              </div>
              <ul className="space-y-4 mb-10 min-h-[160px]">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className={`block text-center py-4 rounded-xl font-bold text-sm transition-all ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-muted border border-border"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="font-bold text-lg text-foreground">
              SanctionsGuard
            </span>
          </div>

          <div className="text-center md:text-left">
            <span className="text-muted-foreground text-xs block">
              © {new Date().getFullYear()} SanctionsGuard. For informational
              purposes only — not legal advice.
            </span>
          </div>

          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
