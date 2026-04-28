"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, FileText, Type, CheckCircle2, AlertTriangle, 
  Loader2, ArrowRight, Database, X, ChevronRight, Layers
} from "lucide-react";
import api from "@/lib/api";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function BulkScreeningPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { bulkScreeningEnabled } = useFeatureFlags();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [manualText, setManualText] = useState("");
  const [fileData, setFileData] = useState<{ name: string; names: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Split by newline or comma, clean up empty spaces
      const rawNames = content.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 1);
      
      if (rawNames.length === 0) {
        setStatus({ text: "Dosya içeriği boş veya geçersiz format.", type: "error" });
        return;
      }
      
      if (rawNames.length > 1000) {
        setStatus({ text: "Tek seferde maksimum 1000 isim arayabilirsiniz.", type: "error" });
        return;
      }

      setFileData({ name: file.name, names: rawNames });
      setStatus({ text: "", type: null });
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setFileData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const bulkMutation = useMutation({
    mutationFn: async (namesToScreen: string[]) => {
      return (await api.post("/screening/bulk", { names: namesToScreen })).data;
    },
    onSuccess: (data) => {
      setStatus({ text: data.message || "Toplu tarama arka plan kuyruğuna başarıyla eklendi!", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setFileData(null);
      setManualText("");
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    },
    onError: (err: any) => {
      setStatus({ text: err.response?.data?.message || "Tarama başlatılırken hata oluştu.", type: "error" });
    }
  });

  const handleRunScreening = () => {
    let finalNames: string[] = [];

    if (activeTab === "upload" && fileData) {
      finalNames = fileData.names;
    } else if (activeTab === "manual" && manualText.trim()) {
      finalNames = manualText.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 1);
    }

    if (finalNames.length === 0) {
      setStatus({ text: "Lütfen taranacak isimleri girin veya geçerli bir dosya yükleyin.", type: "error" });
      return;
    }
    
    if (finalNames.length > 1000) {
      setStatus({ text: "Tek seferde maksimum 1000 isim arayabilirsiniz.", type: "error" });
      return;
    }

    bulkMutation.mutate(finalNames);
  };

  if (!bulkScreeningEnabled) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-12">
        <div className="w-24 h-24 bg-card border border-destructive/30 rounded-3xl flex items-center justify-center shadow-2xl mb-8 relative">
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
          <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
        </div>
        <h2 className="text-4xl font-black tracking-tighter italic">Feature <span className="text-destructive not-italic">Locked</span></h2>
        <p className="text-muted-foreground text-sm mt-3 max-w-sm font-medium leading-relaxed">
          Toplu tarama (Bulk Screening) işlemi mevcut abonelik planınızda bulunmuyor. Lütfen daha yüksek bir plana geçiş yapın.
        </p>
      </div>
    );
  }

  const queriesUsed = user?.org?.queriesUsed || 0;
  const queriesLimit = user?.org?.queriesLimit || 1;
  const isUnlimited = queriesLimit === -1;
  const remaining = isUnlimited ? "Unlimited" : Math.max(0, queriesLimit - queriesUsed);
  const maxAllowed = Math.min(1000, isUnlimited ? 1000 : remaining as number);

  const currentCount = activeTab === "upload" 
    ? (fileData?.names.length || 0) 
    : manualText.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 1).length;

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-1000 pb-20 relative font-sans">
      
      {/* Background Lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Section */}
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-3">
             <Layers className="w-4 h-4" /> High Volume Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Bulk <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Screening</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-2 max-w-xl leading-relaxed">
            Upload CSV/TXT files or enter multiple entities simultaneously to cross-reference against all global watchlists in the background.
          </p>
        </div>
        
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 p-6 rounded-3xl flex items-center gap-5 shadow-xl hover:shadow-primary/5 transition-all text-right">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Batch Limit</p>
            <p className="text-2xl font-black text-foreground tracking-tighter">{maxAllowed}</p>
          </div>
          <div className="w-[1px] h-10 bg-border/50" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Input Detected</p>
            <p className={cn("text-2xl font-black tracking-tighter", currentCount > maxAllowed ? "text-destructive" : "text-emerald-500")}>
              {currentCount}
            </p>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Side: Input Method Selection & Input Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-xl overflow-hidden flex flex-col">
            
            {/* Tabs */}
            <div className="flex border-b border-border/50 bg-muted/20">
              <button 
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-6 text-xs font-black uppercase tracking-[0.2em] transition-all",
                  activeTab === "upload" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Upload className="w-4 h-4" /> File Upload
              </button>
              <button 
                onClick={() => setActiveTab("manual")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-6 text-xs font-black uppercase tracking-[0.2em] transition-all",
                  activeTab === "manual" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Type className="w-4 h-4" /> Manual Entry
              </button>
            </div>

            {/* Input Content Area */}
            <div className="p-8">
              {activeTab === "upload" ? (
                <div className="space-y-6">
                  {!fileData ? (
                    <label className="border-2 border-dashed border-border/60 hover:border-primary/50 bg-background/50 hover:bg-primary/5 rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all group">
                      <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-6">
                        <FileText className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="text-xl font-black text-foreground mb-2 tracking-tight">Select CSV or TXT File</h3>
                      <p className="text-sm font-medium text-muted-foreground text-center max-w-xs">
                        Ensure each name is separated by a new line or comma. Max 1000 names per batch.
                      </p>
                      <input 
                        type="file" 
                        accept=".csv,.txt" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                      />
                    </label>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">File Ready</p>
                          <h4 className="text-lg font-bold text-foreground">{fileData.name}</h4>
                          <p className="text-xs font-medium text-muted-foreground">{fileData.names.length} valid entities detected.</p>
                        </div>
                      </div>
                      <button 
                        onClick={removeFile}
                        className="p-3 bg-background border border-border rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                      Enter Names (Comma or Newline separated)
                    </label>
                  </div>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="E.g. Viktor Bout, Osama bin Laden&#10;Vladimir Putin"
                    className="w-full bg-background/50 border border-border/50 rounded-3xl p-6 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[300px] resize-y shadow-inner leading-relaxed"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Action Panel */}
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
            
            <h3 className="text-lg font-black tracking-tighter uppercase italic mb-6 text-foreground">Batch Summary</h3>
            
            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">Input Source</span>
                <span className="font-black uppercase text-foreground text-[10px] tracking-widest bg-card px-3 py-1 rounded-lg border border-border/50">{activeTab}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">Total Entities</span>
                <span className="font-mono font-bold">{currentCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-4 border-t border-border/50">
                <span className="text-muted-foreground font-bold">Estimated Time</span>
                <span className="font-mono font-bold text-blue-500">~{Math.max(1, Math.ceil(currentCount / 50))} min</span>
              </div>
            </div>

            {status.text && (
              <div className={cn(
                "p-4 rounded-2xl border text-xs font-bold mb-6 flex items-start gap-3",
                status.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}>
                {status.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                <p className="leading-relaxed">{status.text}</p>
              </div>
            )}

            <button
              onClick={handleRunScreening}
              disabled={bulkMutation.isPending || currentCount === 0 || currentCount > maxAllowed}
              className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 relative z-10"
            >
              {bulkMutation.isPending ? (
                <>Deploying Engine <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Run Batch Engine <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
          
          <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm">
             <div className="flex gap-3 text-muted-foreground">
                <Database className="w-5 h-5 shrink-0 text-blue-500" />
                <p className="text-[11px] font-medium leading-relaxed">
                  Bulk screening operations are sent to our secure background processing queue. You will be able to review the full batch report in your history once completed.
                </p>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
