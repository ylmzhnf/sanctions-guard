"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data?.access_token) {
        login(response.data.access_token);
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center font-sans">
      <div className="bg-[#111827] p-10 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sanctions<span className="text-blue-500">Guard</span></h1>
          <p className="text-slate-400 text-sm mt-2">Enterprise Compliance Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="text-red-500 text-xs bg-red-500/10 p-3 rounded border border-red-500/20 text-center">{error}</div>}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
            <input 
              type="email" 
              className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center">
            {isLoading ? "Logging in..." : "Login"} <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}