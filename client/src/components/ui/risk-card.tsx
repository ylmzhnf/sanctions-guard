import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

/**
 * Risk Card Component — RegTech Professional Display
 *
 * Purpose:
 * - Professional presentation of compliance screening results
 * - Risk level indicators with semantic color coding
 * - Accessibility-first design (WCAG AA+)
 *
 * Features:
 * - Icon-based visual hierarchy (matches risk level)
 * - Subtle animations and transitions
 * - Dark mode support
 * - Semantic HTML for screen readers
 * - Professional typography and spacing
 */

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAR";

interface RiskConfig {
  level: RiskLevel;
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
}

const RISK_CONFIGS: Record<RiskLevel, RiskConfig> = {
  CRITICAL: {
    level: "CRITICAL",
    icon: <AlertCircle className="w-5 h-5" />,
    label: "Critical Risk",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    textColor: "text-red-900 dark:text-red-200",
    borderColor: "border-red-300 dark:border-red-800",
    accentColor: "bg-red-500",
  },
  HIGH: {
    level: "HIGH",
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "High Risk",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-900 dark:text-orange-200",
    borderColor: "border-orange-300 dark:border-orange-800",
    accentColor: "bg-orange-500",
  },
  MEDIUM: {
    level: "MEDIUM",
    icon: <Info className="w-5 h-5" />,
    label: "Medium Risk",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    textColor: "text-amber-900 dark:text-amber-200",
    borderColor: "border-amber-300 dark:border-amber-800",
    accentColor: "bg-amber-500",
  },
  LOW: {
    level: "LOW",
    icon: <Info className="w-5 h-5" />,
    label: "Low Risk",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    textColor: "text-blue-900 dark:text-blue-200",
    borderColor: "border-blue-300 dark:border-blue-800",
    accentColor: "bg-blue-500",
  },
  CLEAR: {
    level: "CLEAR",
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "Clear",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    textColor: "text-emerald-900 dark:text-emerald-200",
    borderColor: "border-emerald-300 dark:border-emerald-800",
    accentColor: "bg-emerald-500",
  },
};

interface RiskCardProps {
  riskLevel: RiskLevel;
  title: string;
  description?: string;
  details?: Array<{
    label: string;
    value: string | number;
  }>;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function RiskCard({
  riskLevel,
  title,
  description,
  details,
  children,
  className,
  compact = false,
}: RiskCardProps) {
  const config = RISK_CONFIGS[riskLevel];

  return (
    <article
      className={cn(
        "rounded-lg border p-6 transition-all hover:shadow-md",
        config.bgColor,
        config.textColor,
        config.borderColor,
        className,
      )}
      role="region"
      aria-label={`${config.label}: ${title}`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Left accent line */}
        <div
          className={cn(
            "w-1 rounded-full shrink-0 h-full min-h-12",
            config.accentColor,
          )}
          aria-hidden="true"
        />

        {/* Icon and content */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn("text-lg", config.textColor)}>
              {config.icon}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              {config.label}
            </span>
          </div>

          <h3
            className={cn(
              "text-lg font-semibold leading-tight mb-1",
              config.textColor,
            )}
          >
            {title}
          </h3>

          {description && (
            <p
              className={cn(
                "text-sm leading-relaxed opacity-90 mb-4",
                config.textColor,
              )}
            >
              {description}
            </p>
          )}

          {/* Details Grid */}
          {details && details.length > 0 && (
            <div
              className={cn(
                "grid gap-3 mt-4",
                compact ? "grid-cols-2 text-xs" : "grid-cols-1 text-sm",
              )}
            >
              {details.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="opacity-75 font-medium">
                    {detail.label}:
                  </span>
                  <span className="font-semibold">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Children (custom content) */}
      {children && (
        <div className="mt-6 pt-6 border-t border-current opacity-50">
          {children}
        </div>
      )}
    </article>
  );
}

/**
 * Risk Badge Inline Component
 * Compact risk indicator for use in tables, lists, etc.
 */

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  compact?: boolean;
  className?: string;
}

export function RiskBadge({
  riskLevel,
  compact = false,
  className,
}: RiskBadgeProps) {
  const config = RISK_CONFIGS[riskLevel];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        config.bgColor,
        config.textColor,
        config.borderColor,
        className,
      )}
      role="status"
    >
      <span className="text-xs">{config.icon}</span>
      {!compact && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Risk Summary Component
 * Displays a concise risk assessment summary
 */

interface RiskSummaryProps {
  riskLevel: RiskLevel;
  entityName: string;
  matchCount?: number;
  confidence?: number;
  className?: string;
}

export function RiskSummary({
  riskLevel,
  entityName,
  matchCount,
  confidence,
  className,
}: RiskSummaryProps) {
  const config = RISK_CONFIGS[riskLevel];

  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex items-center justify-between",
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("text-base", config.textColor)}>{config.icon}</span>
        <div>
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-wider opacity-75",
              config.textColor,
            )}
          >
            {config.label}
          </p>
          <p className={cn("text-sm font-semibold", config.textColor)}>
            {entityName}
          </p>
        </div>
      </div>

      {/* Stats */}
      {(matchCount !== undefined || confidence !== undefined) && (
        <div className="flex gap-6">
          {matchCount !== undefined && (
            <div className="text-right">
              <p className={cn("text-xs opacity-75", config.textColor)}>
                Matches
              </p>
              <p className={cn("text-lg font-bold", config.textColor)}>
                {matchCount}
              </p>
            </div>
          )}
          {confidence !== undefined && (
            <div className="text-right">
              <p className={cn("text-xs opacity-75", config.textColor)}>
                Score
              </p>
              <p className={cn("text-lg font-bold", config.textColor)}>
                {typeof confidence === "number"
                  ? `${(confidence * 100).toFixed(0)}%`
                  : confidence}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
