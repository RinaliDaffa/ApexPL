"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerNormalized, PlayerPosition } from "@/lib/types";
import { getFplPlayerPhotoUrl } from "@/lib/fplAssets";
import { ChipList } from "./ChipList";
import { useCompareSelection } from "@/context/CompareContext";

interface GlobalPlayerCardProps {
  player: PlayerNormalized;
  index: number;
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MID: "bg-green-500/20 text-green-400 border-green-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

function PositionPill({ position }: { position: PlayerPosition }) {
  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5
        text-[9px] font-semibold tracking-wide
        rounded border
        ${POSITION_COLORS[position]}
      `}
    >
      {position}
    </span>
  );
}

// Mini TCVF signal strip (lightweight - no interactive tooltips for performance)
function MiniTCVFStrip({ features }: { features: PlayerNormalized["features"] }) {
  const maxVal = Math.max(features.threat, features.creativity, features.value, features.form, 30);
  const bars = [
    { value: features.threat, key: "T" },
    { value: features.creativity, key: "C" },
    { value: features.value, key: "V" },
    { value: features.form, key: "F" },
  ];

  return (
    <div className="flex items-end gap-0.5" aria-hidden="true">
      {bars.map((bar) => (
        <div
          key={bar.key}
          className={`w-1.5 rounded-t ${
            bar.value > 0 
              ? bar.value >= maxVal * 0.9 
                ? "bg-accent-mint/70" 
                : "bg-white/25"
              : "bg-white/10"
          }`}
          style={{ height: Math.max(4, (bar.value / 100) * 16) }}
        />
      ))}
    </div>
  );
}

export function GlobalPlayerCard({
  player,
  index,
}: GlobalPlayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectPlayer, selectedA, selectedB } = useCompareSelection();

  // Check if this player is A or B
  const isPlayerA = selectedA?.id === player.id;
  const isPlayerB = selectedB?.id === player.id;
  const isSelected = isPlayerA || isPlayerB;

  const handleCompareClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectPlayer({
      id: player.id,
      name: player.name,
      teamShortName: player.teamShortName,
      position: player.position,
    });
  }, [selectPlayer, player]);

  const handleCompareKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleCompareClick(e);
    }
  }, [handleCompareClick]);

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  // Simple teaser from tags
  const teaser = player.tags.length > 0 
    ? `${player.tags[0]} performer` 
    : "Core squad member";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.3) }}
      className="relative"
    >
      <Link
        href={`/players/${player.id}`}
        aria-label={`View details for ${player.name}, ${player.position}`}
        className={`
          block cursor-pointer select-none
          bg-bg-1/95 backdrop-blur-sm
          rounded-[12px] border
          shadow-[0_2px_10px_rgba(0,0,0,0.12)]
          transition-all duration-150 ease-out
          hover:bg-bg-2/95
          hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]
          hover:-translate-y-0.5
          focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
          ${isSelected 
            ? isPlayerA
              ? "border-accent-mint/50 shadow-[0_0_12px_rgba(0,255,135,0.12)]" 
              : "border-highlight-pink/50 shadow-[0_0_12px_rgba(255,107,157,0.12)]"
            : "border-white/[0.04] hover:border-white/[0.08]"
          }
        `}
      >
        {/* A/B marker */}
        {isSelected && (
          <div className={`
            absolute top-2 left-2 
            w-5 h-5 rounded-full flex items-center justify-center
            text-[10px] font-bold z-10
            ${isPlayerA ? "bg-accent-mint text-bg-0" : "bg-highlight-pink text-bg-0"}
          `}>
            {isPlayerA ? "A" : "B"}
          </div>
        )}

        {/* Compare button (top-right) */}
        <button
          onClick={handleCompareClick}
          onKeyDown={handleCompareKeyDown}
          className={`
            absolute top-2 right-2 z-10
            w-6 h-6 rounded-full flex items-center justify-center
            text-[12px] font-bold
            transition-all duration-150
            focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1
            ${isSelected
              ? isPlayerA
                ? "bg-accent-mint text-bg-0 hover:bg-accent-mint/80"
                : "bg-highlight-pink text-bg-0 hover:bg-highlight-pink/80"
              : "bg-white/10 text-text-muted hover:bg-accent-mint/20 hover:text-accent-mint border border-white/10 hover:border-accent-mint/30"
            }
          `}
          aria-label={isSelected ? `Remove ${player.name} from compare` : `Add ${player.name} to compare`}
          title={isSelected ? "Remove from compare" : "+ Compare"}
        >
          {isSelected ? "✓" : "+"}
        </button>

        <div className="p-3">
          {/* Header */}
          <div className="flex items-start gap-2 mb-1.5 pr-8">
            {/* Mini headshot */}
            <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-bg-2">
              {player.photo ? (
                <Image
                  src={getFplPlayerPhotoUrl(player.photo) ?? ""}
                  alt={`${player.name}`}
                  fill
                  className="object-cover"
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-text-faint">
                  {player.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-semibold text-text-strong truncate">{player.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PositionPill position={player.position} />
                <span className="text-[9px] text-text-faint">{player.teamShortName}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {player.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {player.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-text-muted border border-white/[0.06]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Teaser with fade */}
          <p
            className="text-[11px] text-text-muted mb-2"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maskImage: "linear-gradient(to right, black 75%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 75%, transparent 100%)",
            }}
          >
            {teaser}
          </p>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <MiniTCVFStrip features={player.features} />
            <button
              onClick={handleExpand}
              className="text-[8px] text-text-faint hover:text-text-muted transition-colors px-1.5 py-0.5"
              aria-expanded={isExpanded}
            >
              {isExpanded ? "Less" : "More"}
            </button>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  {/* Chips */}
                  {player.chips.length > 0 && (
                    <div className="mb-2">
                      <ChipList chips={player.chips} max={2} />
                    </div>
                  )}

                  {/* Hype vs Reality */}
                  <div className="flex items-center gap-3 text-[9px]">
                    <div className="flex items-center gap-1">
                      <span className="text-text-faint">Hype</span>
                      <span className="font-mono text-text-muted">{player.hype.score}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-text-faint">Reality</span>
                      <span className="font-mono text-text-muted">{player.reality.score}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
    </motion.div>
  );
}
