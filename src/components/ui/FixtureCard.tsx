"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { motion } from "framer-motion";
import type { FixtureNormalized } from "@/lib/types";
import { resolveFixtureNarrative, getTagStyles } from "@/lib/fixtureNarrative";
import { TeamCrest } from "./TeamCrest";

interface FixtureCardProps {
  fixture: FixtureNormalized;
}

// Format kickoff time as "Sat 15:00 UTC"
function formatKickoff(isoTime: string): string {
  if (!isoTime) return "TBD";
  const date = new Date(isoTime);
  const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  const day = dayFormatter.format(date);
  const time = timeFormatter.format(date);

  return `${day} ${time} UTC`;
}

// Status style map
const STATUS_STYLES = {
  finished: { bg: "bg-text-faint/20", text: "text-text-muted" },
  live: { bg: "bg-status-hot/20", text: "text-status-hot" },
  upcoming: { bg: "bg-accent-mint/10", text: "text-accent-mint" },
};

export function FixtureCard({ fixture }: FixtureCardProps) {
  const router = useRouter();

  const { homeTeam, awayTeam, kickoffTime, finished, started, homeScore, awayScore } = fixture;

  // Use canonical resolver which handles nulls properly
  const narrative = resolveFixtureNarrative(fixture);
  const formattedKickoff = formatKickoff(kickoffTime);
  const tagStyle = getTagStyles(narrative.primary);

  // Use momentum from narrative result (safely handles null)
  const homeMomentum = narrative.homeScore ?? 0;
  const awayMomentum = narrative.awayScore ?? 0;

  // Determine status
  const status = finished ? "finished" : started ? "live" : "upcoming";
  const statusStyle = STATUS_STYLES[status];
  const statusLabel = finished ? "FT" : started ? "LIVE" : "Upcoming";

  // Delta text - use narrative result
  const deltaText =
    narrative.leader === "level" || narrative.leader === "unknown"
      ? narrative.leader === "unknown" ? "Data pending" : "Level"
      : `Δ +${narrative.delta} ${narrative.leader === "home" ? "Home" : "Away"}`;

  const handleClick = useCallback(() => {
    router.push(`/matchday/${fixture.id}`);
  }, [router, fixture.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`
        relative group cursor-pointer select-none
        bg-bg-1/95 backdrop-blur-sm
        rounded-[16px]
        border border-white/[0.04]
        shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]
        transition-all duration-200 ease-out
        hover:bg-bg-2/95
        hover:shadow-[0_8px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]
        hover:border-white/[0.08]
        hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
        min-h-[180px]
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`${homeTeam.shortName} vs ${awayTeam.shortName}, ${formattedKickoff}. ${narrative.primary}. ${deltaText}. Click to view match details.`}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Row 1: Teams with Crests + Status */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {/* Home Team */}
            <div className="flex items-center gap-1.5">
              <TeamCrest teamCode={homeTeam.code} shortName={homeTeam.shortName} size={24} />
              <span className="text-[14px] font-bold text-text-strong">{homeTeam.shortName}</span>
            </div>
            
            <span className="text-text-muted text-[12px]">vs</span>
            
            {/* Away Team */}
            <div className="flex items-center gap-1.5">
              <TeamCrest teamCode={awayTeam.code} shortName={awayTeam.shortName} size={24} />
              <span className="text-[14px] font-bold text-text-strong">{awayTeam.shortName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span
              className={`
                text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide
                ${statusStyle.bg} ${statusStyle.text}
              `}
            >
              {statusLabel}
            </span>
            {/* Show score if finished */}
            {finished && homeScore !== undefined && awayScore !== undefined && (
              <span className="text-sm font-bold text-text-strong font-mono">
                {homeScore}-{awayScore}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Kickoff Time */}
        <div aria-label={`Kickoff: ${formattedKickoff}`} className="mb-3">
          <span className="text-[11px] text-text-muted font-mono tracking-wide">
            {formattedKickoff}
          </span>
        </div>

        {/* Row 3: Momentum Bar (taller) */}
        <div
          className="flex items-center justify-center gap-1.5 mb-2"
          aria-label={`Momentum: Home ${homeMomentum}, Away ${awayMomentum}`}
          role="img"
        >
          {/* Home bar */}
          <div className="flex-1 flex justify-end">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${Math.max(homeMomentum, 8)}%`,
                background: `linear-gradient(90deg, transparent 0%, rgba(0,255,135,0.5) 100%)`,
              }}
            />
          </div>

          {/* Center divider */}
          <div className="w-px h-5 bg-white/15" aria-hidden="true" />

          {/* Away bar */}
          <div className="flex-1 flex justify-start">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${Math.max(awayMomentum, 8)}%`,
                background: `linear-gradient(90deg, rgba(255,0,90,0.5) 0%, transparent 100%)`,
              }}
            />
          </div>
        </div>

        {/* Delta text below bar */}
        <div className="text-center mb-3">
          <span className="text-[10px] font-mono text-text-faint">{deltaText}</span>
        </div>

        {/* Row 4: Primary Tag + Chips */}
        <div className="flex items-center justify-center gap-2 mt-auto flex-wrap">
          {/* Primary tag pill */}
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold
              backdrop-blur-sm border border-current/10
              ${tagStyle.bg} ${tagStyle.text} ${tagStyle.glow}
            `}
          >
            {narrative.primary}
          </span>
          
          {/* Chips (max 2) with polarity-based colors */}
          {narrative.chips.map((chip, i) => {
            // Determine chip style based on content
            let chipStyle = "bg-white/[0.04] text-text-faint border-white/[0.06]";
            if (chip === "Home edge" || chip === "Momentum held") {
              chipStyle = "bg-accent-mint/10 text-accent-mint/70 border-accent-mint/20";
            } else if (chip === "Away surge" || chip === "Momentum upset") {
              chipStyle = "bg-highlight-pink/10 text-highlight-pink/70 border-highlight-pink/20";
            } else if (chip === "Big gap") {
              chipStyle = "bg-status-hot/10 text-status-hot/70 border-status-hot/20";
            } else if (chip === "Swing game") {
              chipStyle = "bg-status-unstable/10 text-status-unstable/70 border-status-unstable/20";
            }
            
            return (
              <span
                key={i}
                className={`text-[9px] px-2 py-0.5 rounded-full border ${chipStyle}`}
              >
                {chip}
              </span>
            );
          })}
        </div>

        {/* Chevron indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 group-hover:text-accent-mint transition-all">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </motion.article>
  );
}
