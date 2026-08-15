"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sliders, Key, Save, AlertTriangle, Loader2, 
  BrainCircuit, Search, CheckCircle2, ShieldCheck, Zap, Settings
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { isAdmin } from "@/lib/auth-utils";
import { AccessDenied } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const userIsAdmin = isAdmin(user);
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
    enabled: userIsAdmin,
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

  if (!userIsAdmin) return <AccessDenied requiredRole="ADMIN" />;
  if (isLoading) return <LoadingState />;

  const thresholdLabel = threshold >= 90 ? "Precision" : threshold >= 75 ? "Balanced" : "Broad";
  const thresholdColor = threshold >= 90 ? "text-emerald-500" : threshold >= 75 ? "text-blue-500" : "text-amber-500";

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-28 relative">
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
            <Settings className="w-4 h-4" /> Engine configuration
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            System{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-slate-600 bg-clip-text text-transparent">
              parameters
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl leading-relaxed">
            Configure match sensitivity and external service integrations.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-md">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Standard mode
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <aside className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
              <Sliders className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Match sensitivity</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Minimum similarity score required to flag a match. Higher values reduce false positives.
          </p>
          <div className="bg-slate-50 border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-amber-700">50% — Broad</span>
              <span className="text-emerald-700">95% — Precise</span>
            </div>
            <div className="text-xs text-muted-foreground">Recommended: 75–90% for most workflows.</div>
          </div>
        </aside>

        <div className="lg:col-span-8 bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Match threshold</span>
            <div className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border",
              threshold >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              threshold >= 75 ? "bg-blue-50 text-blue-700 border-blue-200" :
              "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              <Zap className="w-3.5 h-3.5" /> {thresholdLabel}
            </div>
          </div>
          
          <div className={cn("text-5xl md:text-6xl font-semibold tracking-tight mb-6", thresholdColor)}>
            {threshold}
            <span className="text-2xl text-muted-foreground ml-1">%</span>
          </div>
          
          <div>
            <input 
              type="range" min="50" max="95" step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-full cursor-pointer appearance-none bg-muted accent-primary"
              aria-label="Match sensitivity threshold"
            />
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground mt-3">
              <span>50</span>
              <span>70</span>
              <span>85</span>
              <span>95</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <aside className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-md border border-slate-200">
              <Key className="w-4 h-4 text-slate-700" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Integrations</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            API keys for AI risk explanations and OSINT enrichment.
          </p>
        </aside>

        <div className="lg:col-span-8 space-y-5">
          <KeyInput 
            label="OpenAI Explainer API" 
            description="Powers AI-generated risk narratives and compliance summaries."
            icon={<BrainCircuit className="w-4 h-4 text-slate-600" />}
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

      {/* FLOATING SAVE BAR */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
        <div className={cn(
          "bg-card border p-4 rounded-lg shadow-lg flex items-center justify-between gap-3 transition-opacity",
          hasChanges ? "border-border opacity-100" : "border-border opacity-80"
        )}>
          <div className="flex-1 min-w-0">
            {status.type ? (
              <div className={cn(
                "flex items-center gap-2 text-xs font-medium",
                status.type === "success" ? "text-emerald-700" : "text-destructive"
              )}>
                {status.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {status.msg}
              </div>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">
                {hasChanges ? "Unsaved changes" : "All changes saved"}
              </p>
            )}
          </div>
          <button 
            disabled={!hasChanges || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0"
          >
            {saveMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </footer>
    </div>
  );
}

function KeyInput({ label, description, icon, value, onChange, isEditing, setIsEditing, hasKey }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-slate-50 border border-border rounded-md shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {hasKey && (
          <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3 h-3" /> Configured
          </span>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <input 
          type={isEditing ? "text" : "password"} 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          disabled={!isEditing}
          placeholder={hasKey ? "••••••••••••••••••••" : "Not configured — click Update to add"}
          className="flex-1 min-w-0 bg-background border border-border rounded-md px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <button 
          onClick={() => { setIsEditing(!isEditing); if (!isEditing) onChange(""); }}
          className={cn(
            "px-4 py-2.5 text-sm font-medium rounded-md border transition-colors shrink-0",
            isEditing
              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              : "bg-card text-foreground border-border hover:bg-slate-50"
          )}
        >
          {isEditing ? "Cancel" : "Update"}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading configuration…</p>
    </div>
  );
}