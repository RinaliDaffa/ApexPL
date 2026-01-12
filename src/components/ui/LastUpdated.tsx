"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface LastUpdatedProps {
  timestamp: string;
  sourceStatus: "fresh" | "stale";
}

const FRESHNESS_THRESHOLD_MINUTES = 10;

export function LastUpdated({ timestamp, sourceStatus }: LastUpdatedProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const date = new Date(timestamp);
  
  // Format as UTC
  const timeString = date.toLocaleTimeString("en-GB", { 
    hour: "2-digit", 
    minute: "2-digit",
    timeZone: "UTC"
  });

  const isFresh = sourceStatus === "fresh";

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button
        type="button"
        className="flex items-center gap-2 text-caption text-text-muted hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 rounded-sm"
        aria-describedby={showTooltip ? "update-tooltip" : undefined}
        aria-label={isFresh ? `Live data, updated at ${timeString} UTC` : `Cached data from ${timeString} UTC`}
      >
        <StatusDot status={sourceStatus} />
        <span className="font-mono text-[11px] tracking-wide">
          {isFresh ? (
            <>Live • {timeString} UTC</>
          ) : (
            <>Cached • {timeString} UTC</>
          )}
        </span>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            id="update-tooltip"
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="
              absolute right-0 top-full mt-2 z-50
              px-3 py-2.5 rounded-lg
              bg-bg-2 border border-border-subtle
              text-caption text-text-muted
              shadow-[0_8px_24px_rgba(0,0,0,0.4)] 
              whitespace-nowrap
              max-w-[260px]
            "
          >
            {isFresh ? (
              <div className="space-y-1">
                <p className="text-text font-medium">Data is live</p>
                <p className="text-[11px] text-text-faint">
                  Fresh if updated within {FRESHNESS_THRESHOLD_MINUTES} minutes
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-text font-medium">Degraded mode active</p>
                <p className="text-[11px] text-text-faint leading-relaxed">
                  FPL API is slow or unavailable. Showing last successful data.
                  Scores may be outdated.
                </p>
              </div>
            )}
            {/* Tooltip arrow */}
            <div 
              className="absolute -top-1 right-4 w-2 h-2 bg-bg-2 border-l border-t border-border-subtle rotate-45" 
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ status }: { status: "fresh" | "stale" }) {
  const isFresh = status === "fresh";
  
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {isFresh && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-rising opacity-60" />
      )}
      <span
        className={`
          relative inline-flex rounded-full h-2 w-2
          ${isFresh ? "bg-status-rising" : "bg-status-unstable"}
        `}
      />
    </span>
  );
}
