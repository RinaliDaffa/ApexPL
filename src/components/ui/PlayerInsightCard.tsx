"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlayerNormalized, PlayerPosition } from "@/lib/types";
import { ChipList } from "./ChipList";
import { useCompareSelection } from "@/context/CompareContext";

interface PlayerInsightCardProps {
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

// Feature labels for tooltips
const FEATURE_TOOLTIPS = {
  T: "Threat: Goal scoring potential",
  C: "Creativity: Chance creation ability",
  V: "Value: Price vs performance",
  F: "Form: Recent performance trend",
};

function MiniRadarHint({ features }: { features: PlayerNormalized["features"] }) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const maxVal = Math.max(features.threat, features.creativity, features.value, features.form, 30);
  const bars = [
    { label: "T", value: features.threat, key: "T" },
    { label: "C", value: features.creativity, key: "C" },
    { label: "V", value: features.value, key: "V" },
    { label: "F", value: features.form, key: "F" },
  ];

  return (
    <div 
      className="flex items-end gap-1.5 relative" 
      role="img" 
      aria-label={`Stats: Threat ${features.threat}, Creativity ${features.creativity}, Value ${features.value}, Form ${features.form}`}
    >
      {bars.map((bar) => (
        <div 
          key={bar.key} 
          className="flex flex-col items-center gap-0.5 relative group"
          onMouseEnter={() => setHoveredBar(bar.key)}
          onMouseLeave={() => setHoveredBar(null)}
          onFocus={() => setHoveredBar(bar.key)}
          onBlur={() => setHoveredBar(null)}
          tabIndex={0}
        >
          <div
            className={`w-2.5 rounded-t transition-colors ${
              bar.value > 0 
                ? bar.value >= maxVal * 0.9 
                  ? "bg-accent-mint/80" 
                  : "bg-white/30"
                : "bg-white/10"
            }`}
            style={{ height: Math.max(6, (bar.value / 100) * 22) }}
          />
          <span className="text-[7px] text-text-faint font-medium">{bar.label}</span>
          
          {/* Tooltip */}
          {hoveredBar === bar.key && (
            <div 
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 px-2 py-1 bg-bg-2 border border-white/10 rounded text-[9px] text-text-muted whitespace-nowrap shadow-lg"
              role="tooltip"
            >
              {FEATURE_TOOLTIPS[bar.key as keyof typeof FEATURE_TOOLTIPS]}
              <br />
              <span className="text-text-strong font-mono">{bar.value}/100</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PlayerInsightCard({
  player,
  index,
}: PlayerInsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectPlayer, isSelected, canSelect } = useCompareSelection();

  const selected = isSelected(player.id);
  const selectionDisabled = !canSelect() && !selected;

  const handleClick = useCallback(() => {
    selectPlayer({
      id: player.id,
      name: player.name,
      teamShortName: player.teamShortName,
      position: player.position,
    });
  }, [selectPlayer, player]);

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (e.shiftKey) {
          setIsExpanded((prev) => !prev);
        } else {
          handleClick();
        }
      }
    },
    [handleClick]
  );

  // Generate a simple teaser from tags
  const teaser = player.tags.length > 0 
    ? `${player.tags[0]} performer` 
    : "Core squad member";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 + index * 0.025 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${player.name}, ${player.position}. ${selected ? "Selected" : "Not selected"}. Press to ${selected ? "deselect" : "select"}.`}
      className={`
        relative cursor-pointer select-none
        bg-bg-1/95 backdrop-blur-sm
        rounded-[12px] border
        shadow-[0_3px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)]
        transition-all duration-200 ease-out
        hover:bg-bg-2/95
        hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]
        hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
        ${selected 
          ? "border-accent-mint/50 shadow-[0_0_16px_rgba(0,255,135,0.15),inset_0_1px_0_rgba(0,255,135,0.1)]" 
          : "border-white/[0.04] hover:border-white/[0.08]"
        }
        ${selectionDisabled ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-mint/20 text-accent-mint text-[8px] font-semibold">
          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Selected
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-semibold text-text-strong truncate">{player.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <PositionPill position={player.position} />
              <span className="text-[10px] text-text-faint">{player.teamShortName}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {player.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {player.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted border border-white/[0.06]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Teaser with fade */}
        <p
          className="text-[12px] text-text-muted mb-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
          }}
        >
          {teaser}
        </p>

        {/* Bottom row: ambient signal + expand */}
        <div className="flex items-end justify-between">
          <MiniRadarHint features={player.features} />
          <button
            onClick={handleExpand}
            className="text-[9px] text-text-faint hover:text-text-muted transition-colors px-2 py-1 -mr-2 -mb-1"
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-white/[0.06]">
                {/* Chips */}
                {player.chips.length > 0 && (
                  <div className="mb-3">
                    <ChipList chips={player.chips} max={2} />
                  </div>
                )}

                {/* Mini stats */}
                <div className="flex items-center gap-4 text-[10px]">
                  <div>
                    <span className="text-text-faint">Threat</span>
                    <span className="ml-1 text-text-strong font-mono">{player.features.threat}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">Form</span>
                    <span className="ml-1 text-text-strong font-mono">{player.features.form}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">Hype</span>
                    <span className="ml-1 text-text-strong font-mono">{player.hype.score}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
