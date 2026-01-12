"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePlayers, type PlayersQueryOptions } from "@/hooks";
import { LastUpdated, GlobalPlayerCard } from "@/components/ui";
import type { SortKey, PlayerPosition } from "@/lib/types";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "form", label: "Form" },
  { key: "threat", label: "Threat" },
  { key: "creativity", label: "Creativity" },
  { key: "value", label: "Value" },
];

const POSITION_OPTIONS: { key: PlayerPosition | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "GKP", label: "GKP" },
  { key: "DEF", label: "DEF" },
  { key: "MID", label: "MID" },
  { key: "FWD", label: "FWD" },
];

const MIN_MINS_OPTIONS = [0, 300, 500, 900];

// Skeleton grid
function SkeletonPlayerGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-1 rounded-[12px] border border-white/[0.04] p-3 h-[120px]">
          <div className="h-4 w-20 bg-white/[0.06] rounded mb-2" />
          <div className="h-3 w-12 bg-white/[0.05] rounded mb-2" />
          <div className="h-3 w-full bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="text-center py-16 px-6 bg-bg-1/50 rounded-[16px] border border-white/[0.04]">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
        <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none">
          <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text-strong mb-2">No players found</h3>
      <p className="text-[13px] text-text-muted max-w-sm mx-auto mb-4">
        Try lowering min minutes or clearing the position filter.
      </p>
      <button
        onClick={onClearFilters}
        className="text-accent-mint text-sm hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}

export default function PlayersPage() {
  const [sort, setSort] = useState<SortKey>("form");
  const [position, setPosition] = useState<PlayerPosition | "all">("all");
  const [minMins, setMinMins] = useState(500);
  const [visibleCount, setVisibleCount] = useState(40);

  const queryOptions: PlayersQueryOptions = useMemo(() => ({
    sort,
    position,
    minMins,
  }), [sort, position, minMins]);

  const { data, isLoading, isFetching } = usePlayers(queryOptions);

  const players = data?.data || [];
  const visiblePlayers = players.slice(0, visibleCount);
  const hasMore = visibleCount < players.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 40);
  };

  const handleClearFilters = () => {
    setPosition("all");
    setMinMins(0);
    setVisibleCount(40);
  };

  // Reset visible count on filter change
  const handleSortChange = (newSort: SortKey) => {
    setSort(newSort);
    setVisibleCount(40);
  };

  const handlePositionChange = (newPos: PlayerPosition | "all") => {
    setPosition(newPos);
    setVisibleCount(40);
  };

  const handleMinMinsChange = (mins: number) => {
    setMinMins(mins);
    setVisibleCount(40);
  };

  return (
    <div className="min-h-screen bg-bg-0 relative overflow-hidden pb-24">
      {/* Background texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Top vignette */}
      <div 
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56, 0, 60, 0.4) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <main className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Snapshot
          </Link>
        </motion.div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <span className="text-[11px] uppercase tracking-widest text-text-faint mb-2 block">
            Scouting Hub
          </span>
          <h1 className="text-h1 text-text-strong mb-2">Player Intelligence</h1>
          <p className="text-body text-text-muted max-w-lg">
            Find the gems everyone&apos;s missing. Sort by what matters.
          </p>
        </motion.header>

        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mb-6"
        >
          <span className="text-[12px] text-text-faint">
            {players.length} players • Showing {Math.min(visibleCount, players.length)}
          </span>
          {data && (
            <LastUpdated
              timestamp={data.meta.lastUpdated}
              sourceStatus={data.meta.sourceStatus}
            />
          )}
        </motion.div>

        {/* Sort Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSortChange(opt.key)}
                className={`
                  px-4 py-2 text-[13px] font-medium rounded-full
                  transition-all duration-150
                  ${sort === opt.key 
                    ? "bg-accent-mint text-bg-0 shadow-[0_2px_8px_rgba(0,255,135,0.25)]" 
                    : "bg-bg-2/80 text-text-muted hover:bg-bg-2 hover:text-text"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filters row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-white/[0.06]"
        >
          {/* Position filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-text-faint">Position</span>
            <div className="flex gap-1">
              {POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handlePositionChange(opt.key)}
                  className={`
                    px-2.5 py-1 text-[11px] font-medium rounded
                    transition-colors duration-150
                    ${position === opt.key 
                      ? "bg-white/10 text-text-strong" 
                      : "text-text-faint hover:text-text-muted hover:bg-white/5"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min minutes filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-text-faint">Min Mins</span>
            <div className="flex gap-1">
              {MIN_MINS_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleMinMinsChange(mins)}
                  className={`
                    px-2 py-1 text-[11px] font-mono rounded
                    transition-colors duration-150
                    ${minMins === mins 
                      ? "bg-white/10 text-text-strong" 
                      : "text-text-faint hover:text-text-muted hover:bg-white/5"
                    }
                  `}
                >
                  {mins === 0 ? "Any" : mins}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Player Grid */}
        {(isLoading || isFetching) && <SkeletonPlayerGrid count={20} />}

        {!isLoading && !isFetching && players.length === 0 && (
          <EmptyState onClearFilters={handleClearFilters} />
        )}

        {!isLoading && !isFetching && players.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {visiblePlayers.map((player, index) => (
                <GlobalPlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mt-8"
              >
                <button
                  onClick={handleLoadMore}
                  className="
                    px-6 py-2.5 text-[13px] font-medium
                    bg-bg-2/80 text-text-muted rounded-full
                    hover:bg-bg-2 hover:text-text
                    transition-all duration-150
                  "
                >
                  Load more ({players.length - visibleCount} remaining)
                </button>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Global CompareTray is rendered from providers.tsx */}
    </div>
  );
}
