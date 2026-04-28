import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): string {
  
  return `${(score * 100).toFixed(1)}%`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const RISK_CONFIG: Record<RiskLevel, any> = {
  CLEAR:    { label: "Clear",    bg: "bg-emerald-500/10",  text: "text-emerald-600", border: "border-emerald-200" },
  LOW:      { label: "Low",      bg: "bg-blue-500/10",     text: "text-blue-600",    border: "border-blue-200" },
  MEDIUM:   { label: "Medium",   bg: "bg-orange-500/10",   text: "text-orange-600",  border: "border-orange-200" },
  HIGH:     { label: "High",     bg: "bg-red-500/10",      text: "text-red-600",     border: "border-red-200" },
  CRITICAL: { label: "Critical", bg: "bg-red-600/20",      text: "text-red-700",     border: "border-red-500" },
};

export const PLAN_LABELS: Record<string, string> = {
  FREE:        "Free",
  STARTER:     "Starter",
  BUSINESS:    "Business",
  ENTERPRISE:  "Enterprise",
  SELF_HOSTED: "Self-Hosted",
};