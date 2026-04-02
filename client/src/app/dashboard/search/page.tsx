"use client";

import { FormEvent, useState } from "react";
import { Search, ShieldCheck, BrainCircuit, Lock, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

type SearchResult = {
  id: number;
  matchName: string;
  matchScore: number;
  riskLevel: 'High' | 'Medium' | 'Low' | string;
  source: string;
  type: string;
  country: string;
  aiAnalysis: string;
  fuzzyBreakdown: { [key: string]: number };
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearching(true);
    // V1.0 test data (will connect to Gemini API later)
    setTimeout(() => {
      setResults([{
        id: 1, matchName: "Ivan Petrovich", matchScore: 94, riskLevel: "High",
        source: "OFAC SDN List", type: "Individual", country: "Russia",
        aiAnalysis: "Critical risk: phonetic similarity to queried name is 94%.",
        fuzzyBreakdown: { levenshtein: 88, soundex: 100, jarowinkler: 92 }
      }]);
      setIsSearching(false);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="bg-[#111827] p-8 rounded-2xl border border-slate-800 shadow-xl">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input type="text" placeholder="Name or Vessel..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full bg-[#0B0F14] border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <button disabled={isSearching} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all">
            {isSearching ? 'Searching...' : 'Analyze'}
          </button>
        </form>
        <div className="mt-4 flex items-center space-x-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <span className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1 text-blue-500"/> Fuzzy Matching Active</span>
          <span className="flex items-center"><BrainCircuit className="w-3 h-3 mr-1 text-purple-500"/> AI Risk Analysis Ready</span>
          <span className="flex items-center"><Lock className="w-3 h-3 mr-1 text-green-500"/> Entries Signed</span>
        </div>
      </div>

      {(results.length > 0 || isSearching) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[550px]">
          {/* Sonuç Listesi (SOL) */}
          <div className="lg:col-span-4 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 uppercase text-[10px] font-bold text-slate-400">Eşleşmeler</div>
            <div className="flex-1 overflow-y-auto">
              {results.map(item => (
                <div key={item.id} onClick={() => setSelectedResult(item)} className={`p-5 border-b border-slate-800 cursor-pointer transition-all ${selectedResult?.id === item.id ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : 'hover:bg-slate-800'}`}>
                  <div className="flex justify-between items-start mb-2"><p className="font-bold text-white text-sm">{item.matchName}</p><p className="text-[10px] font-bold text-red-500">%{item.matchScore}</p></div>
                  <div className="flex items-center justify-between"><p className="text-[10px] text-slate-500">{item.source}</p><Badge variant={item.riskLevel?.toLowerCase() === 'high' ? 'critical' : item.riskLevel?.toLowerCase() === 'medium' ? 'warning' : item.riskLevel?.toLowerCase() === 'low' ? 'low' : 'default'}>{item.riskLevel}</Badge></div>
                </div>
              ))}
            </div>
          </div>

          {/* Details panel (RIGHT) */}
          <div className="lg:col-span-8 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
            {!selectedResult ? <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic"><AlertCircle className="opacity-20 mb-2 w-10 h-10" />Select a record</div> : (
              <>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <div><h3 className="text-2xl font-bold text-white mb-1">{selectedResult.matchName}</h3><p className="text-xs text-slate-400">{selectedResult.source}</p></div>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl">
                    <div className="flex items-center space-x-2 mb-3"><BrainCircuit className="w-5 h-5 text-blue-500" /><h4 className="text-[10px] font-bold text-blue-500 uppercase">LLM Risk Analysis</h4></div>
                    <p className="text-sm text-blue-100 italic">{selectedResult.aiAnalysis}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0B0F14] p-4 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Similarity Breakdown</p>
                      {Object.entries(selectedResult.fuzzyBreakdown).map(([k, v]) => (
                        <div key={k} className="mb-2">
                          <div className="flex justify-between text-[10px] mb-1"><span>{k}</span><span className="text-blue-500 font-bold">%{v}</span></div>
                          <div className="w-full bg-slate-800 h-1 rounded-full"><div className="bg-blue-600 h-full" style={{width: `${v}%`}}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}