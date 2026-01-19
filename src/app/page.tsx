"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTeams } from "@/hooks/useTeams";
import { 
  RankedTeamCard, 
  SkeletonGrid, 
  LastUpdated, 
  LeagueContextPanel, 
  SignalStrip, 
  SpotlightTile 
} from "@/components/ui";
import { resetTeaserTracking } from "@/lib/teaser";
import { TeamNormalized } from "@/lib/types";
import { getTeamIdentity } from "@/lib/teamDirectory";

export default function HomePage() {
  // SINGLE SOURCE OF TRUTH: The team grid data is the ranking.
  const { data: teamData, isLoading, isError, error } = useTeams();
  if (teamData) {
      console.log("REAL TEAM IDS:", teamData.data.map(t => `${t.id}:${t.shortName}`));
  }

  // Reset teaser tracking on data change
  useEffect(() => {
    if (teamData) {
      resetTeaserTracking();
    }
  }, [teamData]);

  // Derived State
  const rankedTeams = useMemo(() => {
    if (!teamData?.data) return [];
    // Ensure sorted by momentum score descending
    // Add deterministic tie-breakers: Goal Difference -> Name
    return [...teamData.data].sort((a, b) => {
      // 1. Momentum Score
      const scoreDiff = b.momentum.score - a.momentum.score;
      if (scoreDiff !== 0) return scoreDiff;

      // 2. Goal Difference (Mock calculation if not available, usually explicitly in FPL data, 
      // but let's use 'id' or 'name' for pure determinism if stats missing. 
      // Actually, we don't have GD in TeamNormalized easily accessible without standard stats?
      // Wait, TeamNormalized has 'stats'? Not always.
      // Let's stick to Name for stability.
      return a.shortName.localeCompare(b.shortName);
    });
  }, [teamData]);

  const top1Team = rankedTeams[0];

  // Dev-only Integrity Check
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && rankedTeams.length > 0) {
      // 1. Check all ranked teams have identities
      rankedTeams.forEach(t => {
         // @ts-ignore - we just want to verify it doesn't throw or return empty
         const id = getTeamIdentity(t.id); 
         if (!id.crestUrl) console.warn(`[integrity] Missing crest for team ${t.id}`);
      });
      // 2. Signals
      // (This is implicitly checked by the components rendering)
    }
  }, [rankedTeams]);

  // Logic for Grid Loop: "Never show same narrative tag > 2 times in a row"
  // We need to compute an override map or just pass modified objects?
  // Modified objects is safer for rendering.
  const processedGridTeams = useMemo(() => {
    const result: TeamNormalized[] = [];
    const lastLabels: string[] = [];

    rankedTeams.forEach((team) => {
      let label = team.momentum.label;
      
      // Check last 2
      if (lastLabels.length >= 2) {
        const l1 = lastLabels[lastLabels.length - 1];
        const l2 = lastLabels[lastLabels.length - 2];
        if (label === l1 && label === l2) {
           // Override needed
           label = "Watchlist"; // Neutral fallback as per spec
        }
      }

      // If override happened, clone and enforce
      if (label !== team.momentum.label) {
         // Deep clone needed? Shallow clone sufficient if we only change top props or deep props
         // team.momentum is nested.
         result.push({
           ...team,
           momentum: { ...team.momentum, label: label as any }
         });
      } else {
         result.push(team);
      }
      
      lastLabels.push(label);
    });
    return result;
  }, [rankedTeams]);


  return (
    <div className="min-h-screen bg-bg-0 relative overflow-hidden">
      {/* Background FX */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      <header className="relative">
        <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(56, 0, 60, 0.4) 0%, transparent 60%)" }} aria-hidden="true" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(ellipse, var(--accent-mint) 0%, transparent 70%)" }} aria-hidden="true" />

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
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
              Who&apos;s <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-mint to-white">on fire</span> right now?
            </h1>
            <p className="text-body text-text-muted max-w-lg mx-auto leading-relaxed">
              Real-time rankings. Tap for insights.
            </p>
          </motion.div>
        </div>
      </header>

      <main className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-between mb-8">
           <span className="text-caption text-text-faint">
            {isLoading
              ? "Loading teams..."
              : teamData
              ? `${teamData.data.length} teams • Ranked by momentum`
              : ""}
          </span>
           {teamData && (
             <LastUpdated timestamp={teamData.meta.lastUpdated} sourceStatus={teamData.meta.sourceStatus} />
           )}
        </motion.div>

        {/* Load Content Only When Data Ready */}
        {rankedTeams.length > 0 && (
          <>
            {/* 1. Signals Above Fold */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
               <SignalStrip teams={rankedTeams} />
            </motion.div>

            {/* 2. Spotlight Tile */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
               <SpotlightTile team={top1Team} />
            </motion.div>

            {/* 3. League Context Panel (The list/table replacement) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
               <LeagueContextPanel teams={rankedTeams} />
            </motion.div>
          </>
        )}
        
        {/* Loading State */}
        {isLoading && <SkeletonGrid count={20} />}

        {/* Error State */}
        {isError && (
          <div className="text-center py-12">
            <p className="text-status-hot">Unable to load rankings.</p>
          </div>
        )}
        
        {/* 4. Team Grid */}
        {processedGridTeams.length > 0 && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.3 }}
             className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
           >
             {processedGridTeams.map((team, index) => {
               const rank = index + 1;
               // Rank 1-6 = 2 chips, else 1
               const maxChips = rank <= 6 ? 2 : 1;
               
               return (
                 <RankedTeamCard 
                    key={team.id} 
                    team={team} 
                    rank={rank} 
                    maxChips={maxChips}
                 />
               );
             })}
           </motion.div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="relative border-t border-divider bg-bg-0/80 backdrop-blur-sm py-8">
         <div className="max-w-[1200px] mx-auto px-4 text-center text-caption text-text-faint">
           Apex PL • Data from FPL
         </div>
      </footer>
    </div>
  );
}
