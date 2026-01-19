"use client";

import Link from "next/link";
import { TeamNormalized } from "@/lib/types";
import { getTeamIdentity } from "@/lib/teamDirectory";
import { assertTeamIdentity } from "@/lib/devAssert";
import { Sparkline } from "./Sparkline";

interface SpotlightTileProps {
  team: TeamNormalized;
}

export function SpotlightTile({ team }: SpotlightTileProps) {
  if (!team) return null;
  const identity = getTeamIdentity(team.id);
  
  // DEV-ONLY Assertion
  assertTeamIdentity({
    surface: "Snapshot/Spotlight",
    rowTeamId: team.id,
    rowShortName: team.shortName,
    rowName: team.name,
    resolved: identity
  });

  const { crestUrl } = identity;

  return (
    <div className="mb-8 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-bg-1 to-bg-0 shadow-2xl">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-mint/5 blur-[80px] pointer-events-none" />
      
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
         {/* Identity */}
         <div className="flex items-center gap-6">
            <div className="relative">
               <img src={identity.crestUrl} alt={identity.name} className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg" />
               <div className="absolute -top-2 -right-2 bg-amber-400 text-black font-bold text-xs px-2 py-1 rounded-full shadow-lg border border-white/20">
                 #1 Rank
               </div>
            </div>
            
            <div className="space-y-2">
               <h3 className="text-2xl sm:text-3xl font-bold text-text-strong tracking-tight">
                 {identity.name}
               </h3>
               <div className="flex items-center gap-3">
                 <span className="text-3xl font-mono font-bold text-accent-mint">{team.momentum.score}</span>
                 <div className="h-8 w-[1px] bg-white/10" />
                 <div className="space-y-0.5">
                    <span className="block text-[10px] uppercase text-text-faint tracking-wider">Momentum</span>
                    <span className="block text-xs text-text-muted">Global Leader</span>
                 </div>
               </div>
            </div>
         </div>

         {/* Insights & Visuals */}
         <div className="flex-1 w-full sm:w-auto flex flex-col items-start sm:items-end gap-4 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-8">
            <ul className="space-y-1.5 text-sm text-text-muted">
               {/* 2 Bullets from Chips/Teaser */}
               {team.chips.slice(0, 2).map((chip, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                    {chip}
                  </li>
               ))}
               {team.chips.length === 0 && (
                  <>
                    <li className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                       Unstoppable form
                    </li>
                    <li className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                       Consistency leader
                    </li>
                  </>
               )}
            </ul>

            <div className="w-full sm:w-48 h-12 opacity-80">
               <Sparkline data={team.spark.lastN} width={192} height={48} color="var(--accent-mint)" />
            </div>

            <Link href={`/teams/${team.id}`} className="text-xs font-semibold text-accent-mint hover:text-white transition-colors flex items-center gap-1">
               Open team focus <span aria-hidden="true">&rarr;</span>
            </Link>
         </div>
      </div>
    </div>
  );
}
