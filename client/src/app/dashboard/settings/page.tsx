"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sliders, Key, Save, AlertTriangle, Loader2, 
  BrainCircuit, Search, CheckCircle2, ShieldCheck, Zap, Lock, Settings
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { isEnterprise } = useFeatureFlags();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const queryClient = useQueryClient();
  
  const [threshold, setThreshold] = useState(85);
  const [aiKey, setAiKey] = useState("");
  const [osintKey, setOsintKey] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isOsintEditing, setIsOsintEditing] = useState(false);
  
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  const { data: config, isLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => api.get("/settings/config").then(r => r.data),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (config) {
      setThreshold(config.threshold ?? config.aiThreshold ?? 85);
      setAiKey(config.maskedAiKey ?? "");
      setOsintKey(config.maskedOsintKey ?? "");
    }
  }, [config]);

  const hasChanges = useMemo(() => {
    if (!config) return false;
    return threshold !== (config.threshold ?? config.aiThreshold ?? 85) || isAiEditing || isOsintEditing;
  }, [threshold, config, isAiEditing, isOsintEditing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { threshold };
      if (isAiEditing && aiKey !== config?.maskedAiKey) payload.aiApiKey = aiKey;
      if (isOsintEditing && osintKey !== config?.maskedOsintKey) payload.osintApiKey = osintKey;
      return api.patch("/settings/config", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      setStatus({ type: "success", msg: "Configuration saved successfully." });
      setIsAiEditing(false);
      setIsOsintEditing(false);
      setTimeout(() => setStatus({ type: null, msg: "" }), 4000);
    },
    onError: () => setStatus({ type: "error", msg: "Failed to save configuration." })
  });

  if (!isAdmin) return <AccessDenied />;
  if (isLoading) return <LoadingState />;

  const thresholdLabel = threshold >= 90 ? "Precision" : threshold >= 75 ? "Balanced" : "Broad";
  const thresholdColor = threshold >= 90 ? "text-emerald-500" : threshold >= 75 ? "text-blue-500" : "text-amber-500";

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-32 relative font-sans">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
            <Settings className="w-4 h-4" /> Engine Configuration
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            System <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">Parameters</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-xl leading-relaxed">
            Configure the core compliance engine behavior. Adjust AI sensitivity thresholds and manage secure external service integrations.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card/60 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {isEnterprise ? "Enterprise Node" : "SaaS Mode"}
          </span>
        </div>
      </header>

      {/* ── MATCH THRESHOLD ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <aside className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Sliders className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Match Sensitivity</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Controls the minimum similarity score required to flag a match. Higher values reduce false positives but may miss partial matches.
          </p>
          <div className="bg-card/40 border border-border/50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-amber-500">50% — Broad</span>
              <span className="text-emerald-500">95% — Precise</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">Recommended: 75–90% for most compliance workflows.</div>
          </div>
        </aside>

        <div className="lg:col-span-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Match Threshold</span>
            <div className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 border shadow-sm",
              threshold >= 90 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
              threshold >= 75 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
              "bg-amber-500/10 text-amber-500 border-amber-500/20"
            )}>
              <Zap className="w-3.5 h-3.5 fill-current" /> {thresholdLabel} Mode
            </div>
          </div>
          
          <div className={cn("text-7xl font-black tracking-tighter mb-8 relative z-10", thresholdColor)}>
            {threshold}
            <span className="text-3xl text-muted-foreground/50 ml-1">%</span>
          </div>
          
          <div className="relative z-10">
            <input 
              type="range" min="50" max="95" step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-3 rounded-full cursor-pointer appearance-none bg-muted accent-primary"
            />
            <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground/40 mt-3 tracking-[0.2em]">
              <span>50 — Broad</span>
              <span>70 — Moderate</span>
              <span>85 — Tight</span>
              <span>95 — Precise</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── API INTEGRATIONS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <aside className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Key className="w-5 h-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-black tracking-tight">Integrations</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            {isEnterprise
              ? "Enterprise mode uses system-level infrastructure keys. Override only if needed."
              : "Provide your own keys to enable AI-powered risk explanations and deep OSINT investigations."}
          </p>
          {isEnterprise && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-[11px] font-bold text-emerald-600 leading-relaxed">
              <ShieldCheck className="w-4 h-4 inline mr-2" />
              Enterprise keys are managed via environment configuration.
            </div>
          )}
        </aside>

        <div className="lg:col-span-8 space-y-5">
          <KeyInput 
            label="OpenAI Explainer API" 
            description="Powers AI-generated risk narratives and compliance summaries."
            icon={<BrainCircuit className="w-4 h-4 text-purple-500" />}
            value={aiKey} onChange={setAiKey}
            isEditing={isAiEditing} setIsEditing={setIsAiEditing}
            hasKey={config?.hasAiKey}
          />
          <KeyInput 
            label="SerpApi — OSINT Engine" 
            description="Enables web intelligence gathering from news and social sources."
            icon={<Search className="w-4 h-4 text-blue-500" />}
            value={osintKey} onChange={setOsintKey}
            isEditing={isOsintEditing} setIsEditing={setIsOsintEditing}
            hasKey={config?.hasOsintKey}
          />
        </div>
      </div>

      {/* ── FLOATING SAVE BAR ────────────────────────────────────────────── */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50">
        <div className={cn(
          "backdrop-blur-2xl bg-card/80 border p-5 rounded-3xl shadow-2xl flex items-center justify-between gap-4 transition-all duration-500",
          hasChanges ? "border-primary/30 shadow-primary/10 translate-y-0 opacity-100" : "translate-y-3 opacity-70 border-border/50"
        )}>
          <div className="flex-1 min-w-0">
            {status.type ? (
              <div className={cn(
                "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest",
                status.type === "success" ? "text-emerald-500" : "text-destructive"
              )}>
                {status.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {status.msg}
              </div>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {hasChanges ? "⚠ Unsaved changes detected" : "All changes saved"}
              </p>
            )}
          </div>
          <button 
            disabled={!hasChanges || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            {saveMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Commit Changes</>}
          </button>
        </div>
      </footer>
    </div>
  );
}

// ── Sub Components ───────────────────────────────────────────────────────────

function KeyInput({ label, description, icon, value, onChange, isEditing, setIsEditing, hasKey }: any) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-background border border-border/50 rounded-xl shadow-inner">
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground/70 font-medium mt-0.5">{description}</p>
          </div>
        </div>
        {hasKey && (
          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3 h-3" /> Encrypted
          </span>
        )}
      </div>
      
      <div className="flex gap-3 relative z-10">
        <input 
          type={isEditing ? "text" : "password"} 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          disabled={!isEditing}
          placeholder={hasKey ? "••••••••••••••••••••" : "Not configured — click Update to add"}
          className="flex-1 bg-background border border-border/50 rounded-2xl px-5 py-4 text-xs font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-40 transition-all shadow-inner"
        />
        <button 
          onClick={() => { setIsEditing(!isEditing); if (!isEditing) onChange(""); }}
          className={cn(
            "px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border transition-all shadow-sm",
            isEditing
              ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
              : "bg-card text-foreground border-border/50 hover:bg-muted hover:border-primary/30"
          )}
        >
          {isEditing ? "Cancel" : "Update"}
        </button>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-12">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
        <div className="w-24 h-24 bg-card border border-destructive/30 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
      </div>
      <h2 className="text-4xl font-black tracking-tighter italic">Access <span className="text-destructive not-italic">Restricted</span></h2>
      <p className="text-muted-foreground text-sm mt-3 max-w-sm font-medium leading-relaxed">
        Only users with <span className="font-bold text-foreground">ADMIN</span> clearance can modify system parameters.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Loading Configuration...</p>
    </div>
  );
}