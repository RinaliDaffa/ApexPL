"use client";

import { motion } from "framer-motion";
import type { TeamDriver } from "@/lib/types";

interface DriverCardProps {
  driver: TeamDriver;
  index: number;
}

function TypeIcon({ type }: { type: "attack" | "defense" | "form" }) {
  const icons = {
    attack: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2L14 14H2L8 2Z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
    defense: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1L15 4V9C15 12.3137 11.866 14.5 8 15C4.13401 14.5 1 12.3137 1 9V4L8 1Z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
    form: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 12L5 8L8 10L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return icons[type];
}

function ScoreStrip({ type, score }: { type: "attack" | "defense" | "form"; score: number }) {
  // Color by type - subtle, not neon
  const colors = {
    attack: "bg-gradient-to-r from-highlight-pink/50 to-highlight-pink/10",
    defense: "bg-gradient-to-r from-cyan-500/50 to-cyan-500/10",
    form: "bg-gradient-to-r from-accent-mint/50 to-accent-mint/10",
  };
  const bgColors = {
    attack: "bg-white/5",
    defense: "bg-white/5",
    form: "bg-white/5",
  };

  // Width based on score (0-100)
  const widthPercent = Math.max(20, Math.min(100, score));

  return (
    <div className="relative mt-4">
      {/* Background track */}
      <div className={`h-1.5 w-full rounded-full ${bgColors[type]}`} aria-hidden="true" />
      {/* Filled portion */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${widthPercent}%` }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`absolute top-0 h-1.5 rounded-full ${colors[type]}`}
        aria-hidden="true"
      />
      {/* Score label - only show if score is meaningful */}
      {score > 0 && (
        <span className="absolute right-0 -top-5 text-[9px] text-text-faint font-mono">
          {score}/100
        </span>
      )}
    </div>
  );
}

export function DriverCard({ driver, index }: DriverCardProps) {
  const typeColors = {
    attack: "text-highlight-pink",
    defense: "text-cyan-400",
    form: "text-accent-mint",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      className="
        bg-bg-1/95 backdrop-blur-sm
        rounded-[14px] border border-white/[0.04]
        shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]
        p-5
        transition-all duration-200 ease-out
        hover:bg-bg-2/95
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]
        hover:border-white/[0.08]
        hover:-translate-y-0.5
      "
    >
      {/* Header with icon */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`${typeColors[driver.type]}`}>
          <TypeIcon type={driver.type} />
        </div>
        <h3 className="text-[14px] font-semibold text-text-strong">{driver.title}</h3>
      </div>

      {/* Insight */}
      <p className="text-[13px] leading-relaxed text-text-muted">{driver.insight}</p>

      {/* Score-based strip */}
      <ScoreStrip type={driver.type} score={driver.score} />
    </motion.div>
  );
}
