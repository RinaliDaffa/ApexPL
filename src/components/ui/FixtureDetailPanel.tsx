"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FixtureNormalized } from "@/lib/types";

interface FixtureDetailPanelProps {
  fixture: FixtureNormalized | null;
  onClose: () => void;
  openerRef?: React.RefObject<HTMLElement | null>;
}

// Narrative tag derivation (same as FixtureCard)
function deriveNarrativeTag(
  homeScore: number,
  awayScore: number
): "Momentum Mismatch" | "Momentum Clash" | "Closer Than It Looks" | "Trap Game" {
  const diff = homeScore - awayScore;
  const absd = Math.abs(diff);

  if (awayScore > homeScore && absd >= 10 && absd < 20) {
    return "Trap Game";
  }

  if (absd >= 20) return "Momentum Mismatch";
  if (absd >= 10) return "Momentum Clash";
  return "Closer Than It Looks";
}

// Derive "What to watch" bullets
function deriveWhatToWatch(homeScore: number, awayScore: number, tag: string): string[] {
  const diff = homeScore - awayScore;
  const absd = Math.abs(diff);
  const bullets: string[] = [];

  // Gap-based bullet
  if (absd >= 20) {
    bullets.push("Big gap in momentum");
  } else if (absd < 10) {
    bullets.push("Fine margins — could swing");
  } else {
    bullets.push("Swing game — small moments decide");
  }

  // Direction-based bullet
  if (homeScore > awayScore) {
    bullets.push("Home edge");
  } else if (awayScore > homeScore) {
    bullets.push("Away surge");
  }

  // Trap game special bullet
  if (tag === "Trap Game") {
    bullets.push("Away favored but not safe");
  }

  return bullets.slice(0, 3);
}

// Derive chips (max 2)
function deriveChips(homeScore: number, awayScore: number): string[] {
  const diff = homeScore - awayScore;
  const absd = Math.abs(diff);
  const chips: string[] = [];

  if (absd >= 20) {
    chips.push("Big gap");
  } else if (absd < 10) {
    chips.push("Tight matchup");
  } else {
    chips.push("Swing game");
  }

  if (awayScore > homeScore) {
    chips.push("Away surge");
  } else if (homeScore > awayScore) {
    chips.push("Home edge");
  }

  return chips.slice(0, 2);
}

// Format kickoff time as "Sat 15:00 UTC"
function formatKickoff(isoTime: string): string {
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

  return `${dayFormatter.format(date)} ${timeFormatter.format(date)} UTC`;
}

// Tag style map
const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  "Momentum Mismatch": {
    bg: "bg-status-hot/12",
    text: "text-status-hot",
  },
  "Momentum Clash": {
    bg: "bg-status-unstable/12",
    text: "text-status-unstable",
  },
  "Closer Than It Looks": {
    bg: "bg-status-cooling/12",
    text: "text-status-cooling",
  },
  "Trap Game": {
    bg: "bg-highlight-pink/12",
    text: "text-highlight-pink",
  },
};

export function FixtureDetailPanel({
  fixture,
  onClose,
  openerRef,
}: FixtureDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap
  useEffect(() => {
    if (!fixture) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Store original focus
    const originalFocus = document.activeElement as HTMLElement;

    // Focus close button on open
    closeButtonRef.current?.focus();

    // Add escape listener
    document.addEventListener("keydown", handleKeyDown);

    // Focus trap implementation
    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener("keydown", trapFocus);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", trapFocus);

      // Restore focus to opener
      if (openerRef?.current) {
        openerRef.current.focus();
      } else if (originalFocus && typeof originalFocus.focus === "function") {
        originalFocus.focus();
      }
    };
  }, [fixture, handleKeyDown, openerRef]);

  if (!fixture) return null;

  const { homeTeam, awayTeam, momentumContrast, kickoffTime } = fixture;
  const { homeScore, awayScore } = momentumContrast;
  const narrativeTag = deriveNarrativeTag(homeScore, awayScore);
  const whatToWatch = deriveWhatToWatch(homeScore, awayScore, narrativeTag);
  const chips = deriveChips(homeScore, awayScore);
  const tagStyle = TAG_STYLES[narrativeTag] || TAG_STYLES["Closer Than It Looks"];

  return (
    <AnimatePresence>
      {fixture && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel - Desktop: Side Panel, Mobile: Bottom Sheet */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${homeTeam.shortName} vs ${awayTeam.shortName} fixture details`}
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`
              fixed z-50
              bg-bg-1/95 backdrop-blur-xl
              border-l border-white/[0.06]
              shadow-[-8px_0_32px_rgba(0,0,0,0.4)]
              overflow-y-auto
              
              /* Desktop: Right side panel */
              sm:top-0 sm:right-0 sm:h-full sm:w-[420px] sm:max-w-[90vw]
              sm:rounded-l-2xl
              
              /* Mobile: Bottom sheet */
              max-sm:bottom-0 max-sm:left-0 max-sm:right-0
              max-sm:h-auto max-sm:max-h-[80vh]
              max-sm:rounded-t-2xl max-sm:border-t max-sm:border-l-0
            `}
            style={{
              /* Mobile override animation */
            }}
          >
            {/* Mobile drag indicator */}
            <div className="sm:hidden flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden="true" />
            </div>

            <div className="p-6">
              {/* Close button */}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close panel"
                className="
                  absolute top-4 right-4
                  w-10 h-10 rounded-xl
                  flex items-center justify-center
                  bg-white/[0.04] hover:bg-white/[0.08]
                  border border-white/[0.06] hover:border-white/[0.1]
                  text-text-muted hover:text-text-strong
                  transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-accent-mint
                "
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Header */}
              <header className="mb-6 pr-10">
                <h2 className="text-xl font-bold text-text-strong mb-1">
                  {homeTeam.shortName} vs {awayTeam.shortName}
                </h2>
                <p className="text-sm text-text-muted font-mono">
                  {formatKickoff(kickoffTime)}
                </p>
                {/* Narrative tag */}
                <span
                  className={`
                    inline-flex items-center mt-3 px-3 py-1.5 rounded-full
                    text-[11px] font-semibold uppercase tracking-wide
                    ${tagStyle.bg} ${tagStyle.text}
                    border border-current/10
                  `}
                >
                  {narrativeTag}
                </span>
              </header>

              {/* Momentum Read */}
              <section className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-text-faint font-semibold mb-3">
                  Momentum Read
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Home */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-accent-mint shadow-[0_0_6px_rgba(0,255,135,0.5)]" />
                      <span className="text-xs text-text-muted uppercase tracking-wide">Home</span>
                    </div>
                    <p className="text-2xl font-bold text-accent-mint">{homeScore}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${homeScore}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full rounded-full bg-accent-mint/60"
                      />
                    </div>
                  </div>

                  {/* Away */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-highlight-pink shadow-[0_0_6px_rgba(255,0,90,0.5)]" />
                      <span className="text-xs text-text-muted uppercase tracking-wide">Away</span>
                    </div>
                    <p className="text-2xl font-bold text-highlight-pink">{awayScore}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${awayScore}%` }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="h-full rounded-full bg-highlight-pink/60"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* What to Watch */}
              <section className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-text-faint font-semibold mb-3">
                  What to Watch
                </h3>
                <ul className="space-y-2">
                  {whatToWatch.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-muted"
                    >
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent-mint flex-shrink-0" aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Chips */}
              {chips.length > 0 && (
                <section>
                  <div className="flex gap-2 flex-wrap">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="
                          px-2.5 py-1 rounded-full
                          text-[10px] font-medium uppercase tracking-wide
                          bg-white/[0.04] text-text-muted
                          border border-white/[0.06]
                        "
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
