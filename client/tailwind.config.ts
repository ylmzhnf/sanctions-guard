import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * SanctionsGuard — RegTech Tailwind Configuration
 *
 * Design System:
 * - Typography: Inter (professional, readable) + system fonts fallback
 * - Colors: Trust Blue (primary), Slate Grey (neutral), Clinical Red (risk)
 * - Spacing: 8px grid for consistent layouts
 * - Radius: Subtle curvature (md: 6px) for enterprise polish
 * - Shadows: Professional elevation without dramatic effects
 *
 * Accessibility First:
 * - WCAG AA contrast ratios throughout
 * - Semantic color meaning (red=risk, green=clear, amber=warning)
 * - Motion: Respects prefers-reduced-motion
 * - Typography: Proper hierarchy and font weights
 */

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── TYPOGRAPHY ────────────────────────────────────────────────────── */
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: [
          '"Fira Code"',
          '"Source Code Pro"',
          ...defaultTheme.fontFamily.mono,
        ],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "14px", letterSpacing: "0.3px" }],
        sm: ["13px", { lineHeight: "16px", letterSpacing: "0.2px" }],
        base: ["14px", { lineHeight: "20px", letterSpacing: "0px" }],
        lg: ["16px", { lineHeight: "24px", letterSpacing: "0px" }],
        xl: ["18px", { lineHeight: "28px", letterSpacing: "-0.3px" }],
        "2xl": ["22px", { lineHeight: "32px", letterSpacing: "-0.4px" }],
        "3xl": ["28px", { lineHeight: "40px", letterSpacing: "-0.5px" }],
      },

      /* ── COLOR PALETTE ──────────────────────────────────────────────────── */
      colors: {
        /* Trust Blue — Primary brand color (professional, compliance-focused) */
        primary: {
          50: "#f0f6ff", // Lightest background
          100: "#e0ecff",
          200: "#c2d9ff",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6", // Primary blue (brand)
          600: "#2563eb", // Hover state
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#082f49", // Darkest
        },

        /* Slate Grey — Neutral greys (text, borders, backgrounds) */
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b", // Muted text
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },

        /* Clinical Red — Risk/Alert colors (high-contrast) */
        red: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444", // Risk red (clinical)
          600: "#dc2626", // High-risk
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#500724",
        },

        /* Amber/Warning — Medium risk (clear distinction) */
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // Warning amber
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },

        /* Emerald — Clear/Green (clean, safe) */
        emerald: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#10b981", // Clear green
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c1c",
        },

        /* Semantic Colors */
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        popover: "hsl(var(--popover) / <alpha-value>)",
        "popover-foreground": "hsl(var(--popover-foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-foreground": "hsl(var(--accent-foreground) / <alpha-value>)",
        destructive: "hsl(var(--destructive) / <alpha-value>)",
        "destructive-foreground":
          "hsl(var(--destructive-foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },

      /* ── SPACING & SIZING ──────────────────────────────────────────────── */
      spacing: {
        gutter: "24px",
        section: "48px",
      },

      /* ── BORDER RADIUS ────────────────────────────────────────────────── */
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },

      /* ── SHADOWS ────────────────────────────────────────────────────────– */
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.08)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },

      /* ── ANIMATIONS & TRANSITIONS ──────────────────────────────────── */
      animation: {
        "fade-in": "fadeIn 300ms ease-in-out",
        "slide-up": "slideUp 300ms ease-out",
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },

      /* ── TRANSITIONS ────────────────────────────────────────────────– */
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "100ms",
        normal: "200ms",
        slow: "300ms",
      },

      /* ── Z-INDEX SCALE ────────────────────────────────────────────────– */
      zIndex: {
        hide: "-1",
        base: "0",
        docked: "10",
        dropdown: "1000",
        sticky: "20",
        fixed: "30",
        "modal-backdrop": "40",
        modal: "50",
        popover: "60",
        tooltip: "70",
      },
    },
  },

  /* ── PLUGINS ────────────────────────────────────────────────────────────– */
  plugins: [
    require("tailwindcss/plugin")(function ({
      addBase,
      matchUtilities,
      theme,
    }: any) {
      /* Smooth scrolling */
      addBase({
        html: {
          scrollBehavior: "smooth",
        },
        /* Respect user motion preferences */
        "@media (prefers-reduced-motion: reduce)": {
          "*": {
            animation: "none !important",
            transition: "none !important",
          },
        },
      });

      /* Utility: text-subtle (muted text) */
      matchUtilities(
        {
          text: (value: string) => ({
            color: value,
          }),
        },
        {
          values: {
            subtle: "hsl(var(--muted-foreground))",
          },
        },
      );
    }),
  ],
};

export default config;
