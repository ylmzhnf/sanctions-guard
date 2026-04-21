import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RiskLevel } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; dot: string }> = {
  CLEAR: { label: 'Clear', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  LOW: { label: 'Low Risk', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  MEDIUM: { label: 'Medium', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  HIGH: { label: 'High Risk', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export const formatScore = (score: number) => `${(score * 100).toFixed(1)}%`;