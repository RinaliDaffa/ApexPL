"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCompareSelection, type ComparePlayer } from "@/context/CompareContext";
import type { PlayerPosition } from "@/lib/types";

const POSITION_COLORS: Record<PlayerPosition, string> = {
  GKP: "text-amber-400",
  DEF: "text-blue-400",
  MID: "text-green-400",
  FWD: "text-red-400",
};

function PlayerSlot({ 
  player, 
  label, 
  color,
  onRemove 
}: { 
  player: ComparePlayer | null; 
  label: string;
  color: "mint" | "pink";
  onRemove?: () => void;
}) {
  const dotColor = color === "mint" ? "bg-accent-mint" : "bg-highlight-pink";
  const borderColor = color === "mint" ? "border-accent-mint/30" : "border-highlight-pink/30";

  if (!player) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed ${borderColor} opacity-50`}>
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-[11px] text-text-faint">{label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${borderColor} bg-bg-2/50`}>
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] text-text-strong font-medium truncate block">{player.name}</span>
        <span className={`text-[9px] ${POSITION_COLORS[player.position]}`}>
          {player.position} • {player.teamShortName}
        </span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-text-faint hover:text-text-muted transition-colors p-1"
          aria-label={`Remove ${player.name}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function CompareTray() {
  const { selectedA, selectedB, remove, clear } = useCompareSelection();

  const hasSelection = selectedA || selectedB;
  const canCompare = selectedA && selectedB;

  if (!hasSelection) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="
          fixed bottom-4 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-3 px-4 py-3
          bg-bg-1/95 backdrop-blur-md
          border border-white/[0.08]
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        "
        role="region"
        aria-label="Player comparison selection"
      >
        {/* Player A slot */}
        <PlayerSlot 
          player={selectedA} 
          label="Player A" 
          color="mint"
          onRemove={selectedA ? () => remove(selectedA.id) : undefined}
        />

        {/* VS divider */}
        <span className="text-[10px] text-text-faint font-medium">VS</span>

        {/* Player B slot */}
        <PlayerSlot 
          player={selectedB} 
          label="Player B" 
          color="pink"
          onRemove={selectedB ? () => remove(selectedB.id) : undefined}
        />

        {/* Actions */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/[0.08]">
          <button
            onClick={clear}
            className="text-[11px] text-text-faint hover:text-text-muted transition-colors px-2 py-1"
            aria-label="Clear selection"
          >
            Clear
          </button>

          {canCompare && (
            <Link
              href={`/compare?a=${selectedA.id}&b=${selectedB.id}`}
              className="
                inline-flex items-center gap-1.5 px-4 py-1.5
                bg-accent-mint text-bg-0 font-semibold text-[12px]
                rounded-full
                shadow-[0_4px_12px_rgba(0,255,135,0.25)]
                hover:shadow-[0_6px_16px_rgba(0,255,135,0.35)]
                transition-all duration-200
                hover:scale-105
              "
            >
              Compare
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M4 8L8 4M8 4H5M8 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
