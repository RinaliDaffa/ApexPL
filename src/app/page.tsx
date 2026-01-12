"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTeams } from "@/hooks/useTeams";
import { RankedTeamCard, SkeletonGrid, LastUpdated } from "@/components/ui";
import { resetTeaserTracking } from "@/lib/teaser";

export default function HomePage() {
  const { data, isLoading, isError, error } = useTeams();

  // Reset teaser tracking on data change to ensure fresh variety
  useEffect(() => {
    if (data) {
      resetTeaserTracking();
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-bg-0 relative overflow-hidden">
      {/* Subtle background texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Hero Section */}
      <header className="relative">
        {/* Top vignette */}
        <div 
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56, 0, 60, 0.4) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* Accent glow */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-[100px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, var(--accent-mint) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
            {/* Identity chip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-caption text-text-muted"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse" />
              Momentum Snapshot
            </motion.div>

            <h1 className="text-h1 text-text-strong mb-4 leading-tight">
              Who&apos;s{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent-mint via-accent-mint to-white bg-clip-text text-transparent">
                  on fire
                </span>
                <span 
                  className="absolute -inset-x-2 -inset-y-1 bg-accent-mint/10 blur-xl -z-10"
                  aria-hidden="true"
                />
              </span>{" "}
              right now?
            </h1>
            <p className="text-body text-text-muted max-w-lg mx-auto leading-relaxed">
              Real-time momentum rankings across the Premier League.
              <br className="hidden sm:block" />
              Tap any team to see what&apos;s driving their form.
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <span className="text-caption text-text-faint">
            {isLoading
              ? "Loading teams..."
              : data
              ? `${data.data.length} teams • Ranked by momentum`
              : ""}
          </span>

          {data && (
            <LastUpdated
              timestamp={data.meta.lastUpdated}
              sourceStatus={data.meta.sourceStatus}
            />
          )}
        </motion.div>

        {/* Error state */}
        {isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-hot/10 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-status-hot font-medium mb-2">Failed to load teams</p>
            <p className="text-caption text-text-muted max-w-sm mx-auto">
              {error instanceof Error ? error.message : "Please try again later. The FPL API might be temporarily unavailable."}
            </p>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && <SkeletonGrid count={20} />}

        {/* Team Grid */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {data.data.map((team, index) => (
              <RankedTeamCard key={team.id} team={team} rank={index + 1} />
            ))}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-divider bg-bg-0/80 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-caption text-text-faint text-center sm:text-left">
              Data from Fantasy Premier League • Not affiliated with the Premier League
            </p>
            <div className="flex items-center gap-2 text-caption text-text-faint">
              <span className="w-2 h-2 rounded-full bg-accent-mint/50" />
              Apex PL
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
