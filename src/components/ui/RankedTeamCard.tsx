"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamNormalized, TrendDirection } from "@/lib/types";
import { NarrativeBadge } from "./NarrativeBadge";
import { Sparkline } from "./Sparkline";
import { ChipList } from "./ChipList";
import { TeamCrest } from "./TeamCrest";
import { generateTeaser } from "@/lib/teaser";

interface RankedTeamCardProps {
  team: TeamNormalized;
  rank: number;
  maxChips?: number;
}

function getVolatility(lastN: number[]): { level: "Low" | "Medium" | "High"; bars: number; subtext: string } {
  if (lastN.length === 0) return { level: "Low", bars: 1, subtext: "no data" };
  const max = Math.max(...lastN);
  const min = Math.min(...lastN);
  const range = max - min;

  if (range <= 1) return { level: "Low", bars: 1, subtext: "steady" };
  if (range === 2) return { level: "Medium", bars: 2, subtext: "balanced" };
  return { level: "High", bars: 3, subtext: "swingy" };
}

function TrendIndicator({ trend }: { trend: TrendDirection }) {
  const config = {
    up: { icon: "↑", color: "text-status-rising", label: "Trending up" },
    down: { icon: "↓", color: "text-status-hot", label: "Trending down" },
    flat: { icon: "→", color: "text-text-muted", label: "Stable" },
  };
  const { icon, color, label } = config[trend];
  return (
    <span className={`text-sm ${color}`} aria-label={label} title={label}>
      {icon}
    </span>
  );
}

function TrendLabel({ trend }: { trend: TrendDirection }) {
  const labels = { up: "Trending up", down: "Trending down", flat: "Stable form" };
  const colors = { up: "text-status-rising", down: "text-status-hot", flat: "text-text-faint" };
  return <span className={`text-[11px] ${colors[trend]}`}>{labels[trend]}</span>;
}

function VolatilityBars({ bars }: { bars: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm transition-colors ${
            i <= bars ? "bg-accent-mint/70" : "bg-white/10"
          }`}
          style={{ height: 4 + i * 3 }}
        />
      ))}
    </div>
  );
}

export function RankedTeamCard({ team, rank, maxChips = 2 }: RankedTeamCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [teaser, setTeaser] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const volatility = useMemo(() => getVolatility(team.spark.lastN), [team.spark.lastN]);

  useEffect(() => {
    setTeaser(generateTeaser(team, rank));
    // Detect mobile
    setIsMobile(window.matchMedia("(max-width: 640px)").matches);
  }, [team, rank]);

  const navigateToTeam = useCallback(() => {
    router.push(`/teams/${team.id}`);
  }, [router, team.id]);

  const handleClick = useCallback(() => {
    if (isMobile) {
      // Mobile: first tap expands, second tap navigates
      if (isExpanded) {
        navigateToTeam();
      } else {
        setIsExpanded(true);
      }
    } else {
      // Desktop: click navigates directly
      navigateToTeam();
    }
  }, [isMobile, isExpanded, navigateToTeam]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        navigateToTeam();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    },
    [navigateToTeam]
  );

  const showHint = rank <= 3 && isHovered && !isExpanded;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.018, ease: "easeOut" }}
      className={`
        relative group cursor-pointer select-none
        bg-bg-1/95 backdrop-blur-sm
        rounded-[14px] 
        border border-white/[0.04]
        shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]
        transition-all duration-200 ease-out
        hover:bg-bg-2/95
        hover:shadow-[0_8px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]
        hover:border-white/[0.08]
        hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
        ${isExpanded ? "bg-bg-2/95 border-white/[0.08] shadow-[0_8px_28px_rgba(0,0,0,0.35)]" : ""}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isMobile) setIsExpanded(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isMobile) setIsExpanded(false);
      }}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      role="link"
      aria-label={`${team.name}, rank ${rank}, ${team.momentum.label}. Press Enter to view team details.`}
    >
      {/* Rank badge */}
      <div
        className={`
          absolute -top-2 -left-2 z-10
          w-6 h-6 flex items-center justify-center
          text-[10px] font-semibold rounded-full
          border border-bg-0/80
          shadow-[0_2px_6px_rgba(0,0,0,0.25)]
          ${rank === 1 ? "bg-amber-500/70 text-amber-950" : ""}
          ${rank === 2 ? "bg-slate-400/60 text-slate-800" : ""}
          ${rank === 3 ? "bg-orange-600/60 text-orange-100" : ""}
          ${rank > 3 ? "bg-bg-2/90 text-text-muted border-white/[0.06]" : ""}
        `}
        aria-hidden="true"
      >
        {rank}
      </div>

      <div className="p-4 pt-4 min-h-[130px] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <TeamCrest teamCode={team.code} shortName={team.shortName} size={28} />
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-text-strong flex items-center gap-1.5 truncate">
                {team.name}
                <TrendIndicator trend={team.momentum.trend} />
              </h3>
              <span className="text-[10px] text-text-faint tracking-wide uppercase">{team.shortName}</span>
            </div>
          </div>
          <NarrativeBadge label={team.momentum.label} size="sm" />
        </div>

        {/* Teaser with fade mask */}
        <p
          className="text-[13px] leading-[1.45] text-text-muted flex-1 mb-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          }}
        >
          {teaser || "—"}
        </p>

        {/* Bottom row */}
        <div className="flex items-end justify-between mt-auto">
          {/* Micro-sparkline */}
          <div className="transition-opacity duration-150" style={{ opacity: isHovered ? 0.7 : 0.4 }}>
            <Sparkline
              data={team.spark.lastN}
              width={44}
              height={14}
              color="var(--accent-mint)"
              ambient
            />
          </div>

          {/* Navigation hint */}
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1.5 -mr-1.5 -mb-1
              rounded-lg transition-all duration-150
              ${isHovered || isExpanded ? "bg-white/[0.04]" : ""}
            `}
            style={{ minWidth: 44, minHeight: 44, justifyContent: "flex-end" }}
          >
            <AnimatePresence>
              {showHint && (
                <motion.span
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] text-text-faint whitespace-nowrap"
                >
                  View team
                </motion.span>
              )}
            </AnimatePresence>
            <motion.div
              animate={{ x: isHovered ? 2 : 0 }}
              transition={{ duration: 0.15 }}
              className={`transition-colors duration-150 ${isHovered ? "text-accent-mint" : "text-text-faint"}`}
            >
              <ArrowIcon />
            </motion.div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.22 }, opacity: { duration: 0.18, delay: 0.06 } }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: 6 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.18, delay: 0.08 }}
                className="pt-3 mt-3 border-t border-white/[0.06]"
              >
                {/* 2-column grid for metrics */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                  {/* Momentum */}
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-text-faint/70 block mb-1">
                      Momentum
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-text-strong font-mono tabular-nums">
                        {team.momentum.score}
                      </span>
                      <span className="text-[10px] text-text-faint">/100</span>
                    </div>
                  </div>

                  {/* Volatility */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-widest text-text-faint/70 block mb-1">
                      Volatility
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${
                        volatility.level === "High" ? "text-status-unstable" :
                        volatility.level === "Medium" ? "text-text-muted" :
                        "text-accent-mint/80"
                      }`}>
                        {volatility.level}
                      </span>
                      <VolatilityBars bars={volatility.bars} />
                    </div>
                    <span className="text-[9px] text-text-faint/60 mt-0.5">{volatility.subtext}</span>
                  </div>

                  {/* Trend + Last 5 row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-text-faint/70 block mb-1">
                        Trend
                      </span>
                      <TrendLabel trend={team.momentum.trend} />
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-widest text-text-faint/70 block mb-1">
                      Last 5
                    </span>
                    <Sparkline
                      data={team.spark.lastN}
                      width={56}
                      height={20}
                      color="var(--accent-mint)"
                    />
                  </div>
                </div>

                {/* Chips + CTA */}
                <div className="flex items-end justify-between">
                  {team.chips.length > 0 && (
                    <div className="flex-1">
                      <ChipList chips={team.chips} max={maxChips} />
                    </div>
                  )}
                  {isMobile && (
                    <span className="text-[10px] text-accent-mint font-medium">
                      Tap to open →
                    </span>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M5 3L9 7L5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
