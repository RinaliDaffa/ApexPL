"use client";

import { motion } from "framer-motion";
import type { MomentumLabel } from "@/lib/types";

interface NarrativeBadgeProps {
  label: MomentumLabel | string;
  size?: "sm" | "md";
}

const BADGE_STYLES: Record<MomentumLabel, { bg: string; text: string; glow: string }> = {
  "On Fire": {
    bg: "bg-status-hot/15",
    text: "text-status-hot",
    glow: "shadow-[0_0_12px_rgba(255,0,90,0.3)]",
  },
  "Rising": {
    bg: "bg-status-rising/15",
    text: "text-status-rising",
    glow: "shadow-[0_0_12px_rgba(0,255,135,0.3)]",
  },
  "Cooling": {
    bg: "bg-status-cooling/15",
    text: "text-status-cooling",
    glow: "shadow-[0_0_12px_rgba(160,130,255,0.3)]",
  },
  "Unstable": {
    bg: "bg-status-unstable/15",
    text: "text-status-unstable",
    glow: "shadow-[0_0_12px_rgba(255,215,90,0.3)]",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-white/5",
  text: "text-text-muted",
  glow: "",
};

export function NarrativeBadge({ label, size = "md" }: NarrativeBadgeProps) {
  // @ts-ignore - allow arbitrary strings for neutral fallbacks
  const styles = BADGE_STYLES[label] || DEFAULT_STYLE;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${styles.bg} ${styles.text} ${styles.glow}
        ${sizeClasses}
        border border-current/20
      `}
      role="status"
      aria-label={`Team status: ${label}`}
    >
      <StatusIcon label={label} />
      {label}
    </motion.span>
  );
}

function StatusIcon({ label }: { label: string }) {
  // @ts-ignore
  switch (label) {
    case "On Fire":
      return <span className="text-sm">🔥</span>;
    case "Rising":
      return <span className="text-sm">📈</span>;
    case "Cooling":
      return <span className="text-sm">❄️</span>;
    case "Unstable":
      return <span className="text-sm">⚡</span>;
    default:
      return <span className="text-sm">●</span>;
  }
}
