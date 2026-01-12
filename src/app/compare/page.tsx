"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCompare } from "@/hooks/useCompare";
import { LastUpdated, MetricRadarSvg } from "@/components/ui";
import type { PlayerNormalized, PlayerPosition, SortKey } from "@/lib/types";

const POSITION_COLORS: Record<PlayerPosition, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MID: "bg-green-500/20 text-green-400 border-green-500/30",
  FWD: "bg-red-500/20 text-red-400 border-red-500/30",
};

function PositionPill({ position }: { position: PlayerPosition }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold tracking-wide rounded border ${POSITION_COLORS[position]}`}>
      {position}
    </span>
  );
}

// Player snippet card
function PlayerSnippet({ 
  player, 
  color 
}: { 
  player: PlayerNormalized; 
  color: "mint" | "pink";
}) {
  const borderColor = color === "mint" ? "border-accent-mint/30" : "border-highlight-pink/30";
  const dotColor = color === "mint" ? "bg-accent-mint" : "bg-highlight-pink";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: color === "mint" ? 0.1 : 0.15 }}
      className={`
        bg-bg-1/95 backdrop-blur-sm rounded-[14px] border ${borderColor}
        shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-5
      `}
    >
      {/* Color indicator */}
      <div className={`w-3 h-3 rounded-full ${dotColor} mb-3`} aria-hidden="true" />

      <h3 className="text-lg font-bold text-text-strong mb-1">{player.name}</h3>
      
      <div className="flex items-center gap-2 mb-3">
        <PositionPill position={player.position} />
        <span className="text-[11px] text-text-faint">{player.teamShortName}</span>
      </div>

      {/* Tags */}
      {player.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {player.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted border border-white/[0.06]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Hype vs Reality */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-text-faint">Hype</span>
          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-status-unstable/70 rounded-full" 
              style={{ width: `${player.hype.score}%` }}
            />
          </div>
          <span className="font-mono text-text-muted">{player.hype.score}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-faint">Reality</span>
          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-mint/70 rounded-full" 
              style={{ width: `${player.reality.score}%` }}
            />
          </div>
          <span className="font-mono text-text-muted">{player.reality.score}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Key differences callouts
function KeyDifferences({ differences }: { differences: string[] }) {
  const icons = ["⚡", "🎯", "📊"];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="bg-bg-1/95 backdrop-blur-sm rounded-[14px] border border-white/[0.04] shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-6"
    >
      <h3 className="text-[11px] uppercase tracking-widest text-text-faint mb-4">
        Analysis Callouts
      </h3>
      <ul className="space-y-3">
        {differences.map((diff, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-sm" aria-hidden="true">{icons[i % icons.length]}</span>
            <span className="text-[13px] text-text-muted leading-relaxed">{diff}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// Skeleton loaders
function SkeletonHeader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      {[1, 2].map((i) => (
        <div key={i} className="bg-bg-1 rounded-[14px] border border-white/[0.04] p-5 h-[180px]">
          <div className="w-3 h-3 rounded-full bg-white/10 mb-3" />
          <div className="h-6 w-32 bg-white/[0.08] rounded mb-2" />
          <div className="h-4 w-20 bg-white/[0.06] rounded mb-3" />
          <div className="h-3 w-full bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRadar() {
  return (
    <div className="flex justify-center mb-10">
      <div className="w-[320px] h-[320px] rounded-full bg-white/[0.02] border border-white/[0.04]" />
    </div>
  );
}

function SkeletonCallouts() {
  return (
    <div className="bg-bg-1 rounded-[14px] border border-white/[0.04] p-6">
      <div className="h-4 w-32 bg-white/[0.06] rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full bg-white/[0.04] rounded" />
        ))}
      </div>
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md px-6"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-6">
          <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-h2 text-text-strong mb-3">Select 2 Players</h1>
        <p className="text-body text-text-muted mb-6">
          Visit a Team page and select 2 players to compare their stats side-by-side.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-mint text-bg-0 font-medium text-sm rounded-full hover:opacity-90 transition-opacity"
        >
          ← Back to Snapshot
        </Link>
      </motion.div>
    </div>
  );
}

// Main compare content
function CompareContent() {
  const searchParams = useSearchParams();
  const a = Number(searchParams.get("a")) || 0;
  const b = Number(searchParams.get("b")) || 0;

  // If no valid params, show empty state
  if (!a || !b) {
    return <EmptyState />;
  }

  const { data, isLoading, isError, error } = useCompare(a, b);

  if (isError) {
    return (
      <div className="min-h-screen bg-bg-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-status-hot mb-2">Failed to compare players</p>
          <p className="text-caption text-text-muted mb-4">
            {error instanceof Error ? error.message : "Could not find one or both players"}
          </p>
          <Link href="/" className="text-accent-mint text-sm hover:underline">
            ← Back to Snapshot
          </Link>
        </div>
      </div>
    );
  }

  const playerA = data?.data.playerA;
  const playerB = data?.data.playerB;
  const keyDifferences = data?.data.keyDifferences || [];
  const radarDimensions = data?.data.radarDimensions || [];
  const radarLabels = data?.data.radarLabels || [];

  return (
    <div className="min-h-screen bg-bg-0 relative overflow-hidden">
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

      <main className="relative max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="text-[11px] uppercase tracking-widest text-text-faint mb-2 block">
            Head to Head
          </span>
          <h1 className="text-h1 text-text-strong">
            {isLoading ? "Loading..." : `${playerA?.name} vs ${playerB?.name}`}
          </h1>
        </motion.div>

        {/* Status bar */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end mb-6"
          >
            <LastUpdated
              timestamp={data.meta.lastUpdated}
              sourceStatus={data.meta.sourceStatus}
            />
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && (
          <>
            <SkeletonHeader />
            <SkeletonRadar />
            <SkeletonCallouts />
          </>
        )}

        {/* Content */}
        {playerA && playerB && (
          <>
            {/* Player snippets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <PlayerSnippet player={playerA} color="mint" />
              <PlayerSnippet player={playerB} color="pink" />
            </div>

            {/* Radar chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex justify-center mb-10"
            >
              <MetricRadarSvg
                playerA={playerA}
                playerB={playerB}
                dimensions={radarDimensions as SortKey[]}
                labels={radarLabels}
                size={320}
              />
            </motion.div>

            {/* Legend */}
            <div className="flex justify-center gap-8 mb-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-mint" />
                <span className="text-[12px] text-text-muted">{playerA.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-highlight-pink" />
                <span className="text-[12px] text-text-muted">{playerB.name}</span>
              </div>
            </div>

            {/* Key differences */}
            {keyDifferences.length > 0 && (
              <KeyDifferences differences={keyDifferences} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Page component with Suspense for useSearchParams
export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-0 flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
