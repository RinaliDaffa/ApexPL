"use client";

import { motion } from "framer-motion";

interface GWSwitcherProps {
  currentGW?: number;
  selectedGW: number;
  onGWChange: (gw: number) => void;
  isLoading?: boolean;
}

const MIN_GW = 1;
const MAX_GW = 38;

export function GWSwitcher({
  currentGW,
  selectedGW,
  onGWChange,
  isLoading = false,
}: GWSwitcherProps) {
  const canGoPrev = selectedGW > MIN_GW;
  const canGoNext = selectedGW < MAX_GW;

  const handlePrev = () => {
    if (canGoPrev && !isLoading) {
      onGWChange(selectedGW - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && !isLoading) {
      onGWChange(selectedGW + 1);
    }
  };

  const isCurrent = currentGW === selectedGW;

  return (
    <div className="inline-flex items-center gap-1">
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePrev}
        disabled={!canGoPrev || isLoading}
        aria-label="Previous gameweek"
        className={`
          relative flex items-center justify-center
          w-11 h-11 rounded-xl
          bg-white/[0.04] backdrop-blur-md
          border border-white/[0.06]
          text-text-muted
          transition-all duration-200
          ${canGoPrev && !isLoading
            ? "hover:bg-white/[0.08] hover:text-text-strong hover:border-white/[0.1] cursor-pointer"
            : "opacity-40 cursor-not-allowed"
          }
          focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
        `}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>

      {/* GW Label */}
      <div
        className={`
          relative flex items-center justify-center gap-2
          min-w-[80px] h-11 px-4 rounded-xl
          bg-white/[0.04] backdrop-blur-md
          border border-white/[0.06]
          transition-all duration-200
          ${isLoading ? "opacity-60" : ""}
        `}
        role="status"
        aria-live="polite"
        aria-label={`Gameweek ${selectedGW}${isCurrent ? ", current gameweek" : ""}`}
      >
        <span className="text-sm font-semibold text-text-strong tracking-wide">
          GW {selectedGW}
        </span>
        
        {/* Current indicator dot */}
        {isCurrent && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent-mint shadow-[0_0_6px_rgba(0,255,135,0.5)]"
            aria-hidden="true"
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-2 w-1.5 h-1.5 rounded-full bg-text-muted"
            style={{
              animation: "pulse 1s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Next Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleNext}
        disabled={!canGoNext || isLoading}
        aria-label="Next gameweek"
        className={`
          relative flex items-center justify-center
          w-11 h-11 rounded-xl
          bg-white/[0.04] backdrop-blur-md
          border border-white/[0.06]
          text-text-muted
          transition-all duration-200
          ${canGoNext && !isLoading
            ? "hover:bg-white/[0.08] hover:text-text-strong hover:border-white/[0.1] cursor-pointer"
            : "opacity-40 cursor-not-allowed"
          }
          focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0
        `}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform"
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
    </div>
  );
}
