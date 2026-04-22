"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { KeyRound, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return alert("Passwords do not match!");

    setIsLoading(true);
    try {
      await api.patch("/users/change-password", { password });
      
      alert("Your password has been successfully updated! Please log in with your new password.");
      
      logout();
      router.push("/auth/login");
    } catch (err) {
      alert("Password could not be updated. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border p-8 rounded-[32px] w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-primary/10 p-4 rounded-2xl mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
          <p className="text-muted-foreground text-sm mt-2">
            For your security, you must change your temporary password on your first login.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground ml-1">New Password</label>
            <input 
              type="password" required minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground ml-1">New Password (Confirm)</label>
            <input 
              type="password" required
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition"
            />
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            Update Password and Continue
          </button>
        </form>

        <div className="mt-6 p-4 bg-muted/30 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-normal">
            After updating your password, your old temporary password will be invalid.
          </p>
        </div>
      </div>
    </div>
  );
}