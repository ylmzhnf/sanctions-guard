"use client";

import { useState } from "react";
import { Search, ShieldCheck, BrainCircuit, Lock, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge"; 
import api from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

type SearchResult = {
  id: string;
  name: string;
  score: number;
  listSource: string;
  riskLevel: string;
  reason: string;
  createdAt: string;
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const searchMutation = useMutation<SearchResult[], unknown, string>({
    mutationFn: async (query: string) => {
      const response = await api.get(`/screening/search?queryName=${query}`);
      return response.data.success ? response.data.data : [];
    },
    onSuccess: (data) => {
      if (data.length > 0) setSelectedResult(null);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery?.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  const results = searchMutation.data ?? [];
  const isSearching = searchMutation.isPending;

  const getAnalysisText = (item: SearchResult) => {
    return item.reason || "Detailed analysis for this match is being processed.";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Banner */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300 text-sm">Sanctions Screening Engine</p>
          <p className="text-blue-200/80 text-xs mt-1">
            Perform real-time fuzzy matching against consolidated global watchlists. 
            AI analysis provides risk context and match justification.
          </p>
        </div>
      </div>

      {/* Arama Barı */}
      <div className="bg-[#111827] p-8 rounded-2xl border border-slate-800 shadow-xl">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Enter name, entity or vessel IMO..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-[#0B0F14] border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <button 
            disabled={isSearching} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSearching ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
        <div className="mt-4 flex items-center space-x-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <span className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1 text-blue-500"/> Fuzzy Matching Active</span>
          <span className="flex items-center"><BrainCircuit className="w-3 h-3 mr-1 text-purple-500"/> AI Risk Scoring</span>
          <span className="flex items-center"><Lock className="w-3 h-3 mr-1 text-green-500"/> 256-bit Audit Trail</span>
        </div>
      </div>

      {searchMutation.isSuccess && results.length === 0 && !isSearching && (
        <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-800/50 p-4 rounded-full mb-4 ring-4 ring-slate-800/20">
            <AlertCircle className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No matches found in the database</h3>
          <p className="text-slate-400 max-w-md text-sm">
            The entity or individual you searched for did not return any matches against the current watchlists.
          </p>
        </div>
      )}

      {(results.length > 0 || isSearching) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* Sol Liste */}
          <div className="lg:col-span-4 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[600px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 uppercase text-[10px] font-bold text-slate-400 flex justify-between">
              <span>Potential Matches</span>
              <span className="text-blue-500">{isSearching ? '...' : results.length} found</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="p-8 text-center text-slate-500 italic text-sm flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  Scanning database...
                </div>
              ) : (
                results.map((item: SearchResult) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedResult(item)} 
                    className={`p-5 border-b border-slate-800 cursor-pointer transition-all ${selectedResult?.id === item.id ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : 'hover:bg-slate-800'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-white text-sm">{item.name || 'Unnamed Entity'}</p>
                      <p className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        %{Math.round(item.score ?? 0)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 truncate mr-2">{item.listSource ?? 'Global Watchlist'}</p>
                      <Badge 
                        className="text-[9px] h-5" 
                        variant={item.riskLevel?.toLowerCase() === 'high' || item.riskLevel?.toLowerCase() === 'critical' || item.riskLevel?.toLowerCase() === 'exact match' ? 'critical' : 'low'}
                      >
                        {item.riskLevel ?? 'N/A'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sağ Detay / Analiz Paneli */}
          <div className="lg:col-span-8 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[600px]">
            {!selectedResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic">
                <BrainCircuit className="opacity-10 mb-4 w-16 h-16" />
                <p className="text-sm">Select a result to view AI risk analysis</p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-2 duration-300">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedResult.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Source Index:</span>
                      <span className="text-xs text-blue-400 font-medium">{selectedResult.listSource ?? 'International Database'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Risk Rating</p>
                    <Badge 
                      className="px-4 py-1 uppercase"
                      variant={
                        selectedResult.riskLevel?.toLowerCase() === 'high' || selectedResult.riskLevel?.toLowerCase() === 'critical' || selectedResult.riskLevel?.toLowerCase() === 'exact match' ? 'critical' :
                        selectedResult.riskLevel?.toLowerCase() === 'medium' ? 'warning' :
                        'low'
                      }
                    >
                      {selectedResult.riskLevel ?? 'Low'}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* AI ANALİZ  */}
                  <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <BrainCircuit className="w-12 h-12" />
                    </div>
                    <div className="flex items-center space-x-2 mb-3 relative">
                      <BrainCircuit className="w-5 h-5 text-blue-400" />
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Intelligence Analysis</h4>
                    </div>
                    <p className="text-sm text-blue-100/90 leading-relaxed relative">
                      {getAnalysisText(selectedResult)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-600 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <Lock className="w-3 h-3" />
                    <span>This analysis is cryptographically hashed and stored in the audit trail for compliance purposes.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}