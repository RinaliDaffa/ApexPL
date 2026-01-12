"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTeamFocus } from "@/hooks/useTeamFocus";
import {
  NarrativeBadge,
  LastUpdated,
  DriverCard,
  PlayerInsightCard,
} from "@/components/ui";

// Generate narrative from momentum and chips
function generateNarrative(label: string): string {
  const narratives: Record<string, string[]> = {
    "On Fire": [
      "Everything is clicking for this squad right now",
      "Form couldn't be much better at the moment",
      "One of the hottest teams in the league",
    ],
    "Rising": [
      "Building something special here",
      "Momentum is clearly on their side",
      "Getting stronger week by week",
    ],
    "Cooling": [
      "Lost their edge recently",
      "Questions mounting after recent results",
      "Need to find their rhythm again",
    ],
    "Unstable": [
      "Results have been all over the place",
      "Impossible to predict what happens next",
      "Chaos reigns in this camp",
    ],
  };

  const opts = narratives[label] || narratives["Unstable"];
  return opts[Math.floor(Math.random() * opts.length)];
}

// Skeletons
function SkeletonHeader() {
  return (
    <div className="space-y-4 mb-10">
      <div className="h-4 w-32 bg-white/[0.06] rounded" />
      <div className="h-8 w-64 bg-white/[0.08] rounded" />
      <div className="h-5 w-80 bg-white/[0.05] rounded" />
      <div className="flex gap-3">
        <div className="h-6 w-20 bg-white/[0.06] rounded-full" />
        <div className="h-6 w-16 bg-white/[0.05] rounded" />
      </div>
    </div>
  );
}

function SkeletonDriverCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-bg-1 rounded-[14px] border border-white/[0.04] p-5 h-[140px]">
          <div className="h-4 w-24 bg-white/[0.06] rounded mb-3" />
          <div className="h-3 w-full bg-white/[0.05] rounded mb-2" />
          <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonPlayerGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-bg-1 rounded-[12px] border border-white/[0.04] p-4 h-[140px]">
          <div className="h-4 w-28 bg-white/[0.06] rounded mb-2" />
          <div className="h-3 w-16 bg-white/[0.05] rounded mb-3" />
          <div className="h-3 w-full bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyPlayersPanel() {
  return (
    <div className="text-center py-16 px-6 bg-bg-1/50 rounded-[16px] border border-white/[0.04]">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
        <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none">
          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text-strong mb-2">No player data available</h3>
      <p className="text-[13px] text-text-muted max-w-sm mx-auto">
        Player momentum data isn&apos;t available for this team yet. Check back soon.
      </p>
    </div>
  );
}

export default function TeamFocusPage() {
  const params = useParams();
  const teamId = Number(params.id) || 0;

  const { data, isLoading, isError, error } = useTeamFocus(teamId);
  const [narrative, setNarrative] = useState("");

  useEffect(() => {
    if (data?.data.team) {
      setNarrative(generateNarrative(data.data.team.momentum.label));
    }
  }, [data]);

  if (isError) {
    return (
      <div className="min-h-screen bg-bg-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-status-hot mb-2">Failed to load team</p>
          <p className="text-caption text-text-muted mb-4">
            {error instanceof Error ? error.message : "Team not found"}
          </p>
          <Link href="/" className="text-accent-mint text-sm hover:underline">
            ← Back to Snapshot
          </Link>
        </div>
      </div>
    );
  }

  const team = data?.data.team;
  const drivers = data?.data.drivers || [];
  const players = data?.data.players || [];

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

      <main className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

        {/* Loading state */}
        {isLoading && (
          <>
            <SkeletonHeader />
            <SkeletonDriverCards />
            <SkeletonPlayerGrid />
          </>
        )}

        {/* Content */}
        {team && (
          <>
            {/* Team Header */}
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <span className="text-[11px] uppercase tracking-widest text-text-faint mb-2 block">
                Team Focus
              </span>
              <h1 className="text-h1 text-text-strong mb-3">{team.name}</h1>
              <p className="text-body text-text-muted max-w-lg mb-4">{narrative}</p>
              
              <div className="flex items-center gap-4">
                <NarrativeBadge label={team.momentum.label} size="md" />
                <span className="text-caption text-text-faint">
                  Score: <span className="font-mono text-text-muted">{team.momentum.score}/100</span>
                </span>
              </div>
            </motion.header>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-end mb-6"
            >
              {data && (
                <LastUpdated
                  timestamp={data.meta.lastUpdated}
                  sourceStatus={data.meta.sourceStatus}
                />
              )}
            </motion.div>

            {/* Drivers Section */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-12"
            >
              <h2 className="text-[11px] uppercase tracking-widest text-text-faint mb-4">
                What&apos;s Driving Momentum
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {drivers.map((driver, index) => (
                  <DriverCard key={index} driver={driver} index={index} />
                ))}
              </div>
            </motion.section>

            {/* Players Section */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] uppercase tracking-widest text-text-faint">
                  Players Driving Momentum
                </h2>
                <span className="text-[10px] text-text-faint">
                  Click to select for compare
                </span>
              </div>

              {players.length === 0 ? (
                <EmptyPlayersPanel />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {players.map((player, index) => (
                    <PlayerInsightCard
                      key={player.id}
                      player={player}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          </>
        )}
      </main>

      {/* Global CompareTray is rendered from providers.tsx */}
    </div>
  );
}
