"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();
  const { token, login, setUser } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
      return;
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('registered') === '1') {
        setSuccessMessage('Registration successful. Please log in.');
      }
    }
  }, [token, router]);

  const validateForm = () => {
    return email.trim().length > 0 && password.trim().length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please enter a valid email and password with at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data?.access_token) {
        const newToken = response.data.access_token;
        login(newToken); // Token'ı store'a kaydet
        
        // KRİTİK DÜZELTME: Yeni token'ı header'a zorla ekleyerek profili çekiyoruz
        try {
          const userRes = await api.get('/users/me', {
            headers: { Authorization: 'Bearer ' + newToken }
          });
          setUser(userRes.data); // Artık user.role (ADMIN veya USER) sisteme yüklendi!
        } catch (profileErr) {
          console.error("Failed to fetch user profile", profileErr);
        }
        
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4 py-10 font-sans">
      <div className="bg-[#111827] p-10 rounded-[32px] border border-slate-800 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.9)] w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Sanctions<span className="text-blue-400">Guard</span></h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your corporate risk monitoring dashboard</p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-300" />
              {successMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-700 bg-[#141A25] px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-2xl border border-slate-700 bg-[#141A25] px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}