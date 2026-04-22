"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  Settings, Sliders, Key, Save, AlertTriangle, Loader2, BrainCircuit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [threshold, setThreshold] = useState(85);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isKeyChanged, setIsKeyChanged] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: async () => {
      const response = await api.get("/settings/config");
      return response.data;
    },
    enabled: isAdmin, 
  });

  useEffect(() => {
    if (config?.threshold) setThreshold(config.threshold);
    if (config?.maskedApiKey) {
      setApiKeyInput(config.maskedApiKey);
      setIsKeyChanged(false); // Yeni veri geldi, değişiklik yok
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { threshold };
      if (isKeyChanged) {
        payload.aiApiKey = apiKeyInput;
      }
      const res = await api.patch("/settings/config", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      setIsKeyChanged(false);
      alert("Settings and AI configuration saved successfully!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to save settings.");
    }
  });

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(e.target.value);
    setIsKeyChanged(true);
  };

  const isSaveDisabled = 
    saveMutation.isPending || 
    isLoading || 
    (threshold === config?.threshold && !isKeyChanged);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center bg-card border border-border rounded-2xl shadow-lg">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2">Only administrators can view and modify system configurations.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure global parameters and AI connections.</p>
      </div>

      <div className="grid gap-6">
        
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-xs uppercase tracking-widest text-foreground">Screening Engine</h2>
          </div>
          
          <div className="p-6 space-y-6 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin"/> Loading config...</div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold text-foreground">Fuzzy Match Sensitivity</label>
                  <Badge className="bg-primary/10 text-primary">{threshold}%</Badge>
                </div>
                <input
                  type="range" min="50" max="100" value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-3 italic">
                  Higher threshold results in fewer, but more accurate matches. 85% is recommended.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-xs uppercase tracking-widest text-foreground">AI Integration (BYOK)</h2>
            </div>
            {config?.hasApiKey ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase">Active</Badge>
            ) : (
              <Badge variant="warning" className="text-[10px] uppercase">Required</Badge>
            )}
          </div>
          
          <div className="p-6 space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
              <p className="text-xs text-foreground/80 leading-relaxed">
                To enable AI-powered risk explanations during screening, you must provide your own OpenAI API key. 
                Your key is encrypted and stored securely. We do not charge you for AI usage.
              </p>
            </div>

            <label className="text-sm font-bold text-foreground block mb-2">OpenAI API Key</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password" 
                  placeholder="sk-proj-..."
                  value={apiKeyInput}
                  onChange={handleKeyChange}
                  className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              You can obtain an API key from your <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline">OpenAI Dashboard</a>.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={isSaveDisabled}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save All Configurations
          </button>
        </div>

      </div>
    </div>
  );
}