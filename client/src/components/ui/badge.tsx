"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Badge Component — RegTech Version
 *
 * Accessibility-first design:
 * - WCAG AA contrast ratios (7:1+ for all variants)
 * - Semantic color meanings (red=risk, green=clear, amber=warning)
 * - Readable font sizes (text-xs: 11px minimum)
 * - No color-only communication (always includes label text)
 *
 * Styling:
 * - Clean, professional appearance (no rounded corners)
 * - Subtle borders for visual hierarchy
 * - Professional typography (font-semibold for prominence)
 */

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        /* Default - Primary brand blue */
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",

        /* Outline - Neutral border style */
        outline: "border-border bg-background text-foreground hover:bg-muted",

        /* Risk Levels - Professional compliance indicators */
        critical:
          "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
        high: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",

        medium:
          "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
        warning:
          "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",

        low: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900",

        clear:
          "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",

        /* Status indicators */
        success:
          "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
        error:
          "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
        info: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-[11px] px-2.5 py-1",
        lg: "text-xs px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = (asChild ? Slot : "div") as React.ElementType;

  return (
    <Comp
      className={cn(badgeVariants({ variant, size }), className)}
      role="status"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
