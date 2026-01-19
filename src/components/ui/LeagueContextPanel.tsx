import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamNormalized } from "@/lib/types";
import { getTeamIdentity } from "@/lib/teamDirectory";
import { assertTeamIdentity } from "@/lib/devAssert";
import { Sparkline } from "./Sparkline";

interface LeagueContextPanelProps {
  teams: TeamNormalized[];
}

export function LeagueContextPanel({ teams }: LeagueContextPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // 1. Top 5 vs Full List
  const displayedTeams = expanded ? teams : teams.slice(0, 5);

  // 2. Biggest Movers (Derived)
  const getDelta = (t: TeamNormalized) => {
    const data = t.spark.lastN;
    if (data.length < 2) return 0;
    return data[data.length - 1] - data[0]; 
  };

  const sortedByDelta = [...teams].sort((a, b) => getDelta(b) - getDelta(a));
  const topRiser = sortedByDelta[0];
  const topFaller = sortedByDelta[sortedByDelta.length - 1];

  // 3. Title Context (Derived)
  const top1 = teams[0].momentum.score;
  const top6 = teams[5]?.momentum.score ?? 0;
  const spread = top1 - top6;
  
  let contextBlurb = "Competitive mid-table — small swings matter.";
  if (spread >= 25) {
     contextBlurb = "Momentum distribution is top-heavy this week.";
  } else if (spread < 10) {
     contextBlurb = "Extremely tight race at the top.";
  }

  // Helper for rendering chips
  const renderMover = (team: TeamNormalized, type: "rise" | "fall") => {
    const delta = getDelta(team);
    const label = type === "rise" ? "Top Riser" : "Cooling Off";
    const color = type === "rise" ? "text-status-rising" : "text-status-hot";
    const sign = delta > 0 ? "+" : "";
    const identity = getTeamIdentity(team.id);

    return (
      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
         <img src={identity.crestUrl} alt={identity.shortName} className="w-6 h-6 object-contain" />
         <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-text-faint">{label}</span>
            <span className="text-xs font-semibold text-text-strong flex items-center gap-1">
              {identity.shortName} <span className={`font-mono ${color}`}>{sign}{delta}</span>
            </span>
         </div>
      </div>
    );
  };

  return (
    <div className="mb-12 border-t border-white/5 pt-8">
      {/* Title + Context Microcopy */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-strong">League Tempo</h2>
          <p className="text-xs text-text-muted mt-1">{contextBlurb}</p>
        </div>
        
        {/* Movers Chips */}
        <div className="flex gap-2">
           {topRiser && renderMover(topRiser, "rise")}
           {topFaller && renderMover(topFaller, "fall")}
        </div>
      </div>

      {/* Mini Table Panel */}
      <div className="bg-surface-elevation-1/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
           <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Momentum Standings</span>
           <span className="text-[10px] bg-accent-mint/10 text-accent-mint px-2 py-0.5 rounded-full font-mono">
             Live Rank
           </span>
        </div>

        <div className="divide-y divide-white/5">
          {displayedTeams.map((team, idx) => {
             const identity = getTeamIdentity(team.id);
            
            // DEV-ONLY Assertion
            assertTeamIdentity({
              surface: "Snapshot/LeagueContext",
              rowTeamId: team.id,
              rowShortName: team.shortName,
              rowName: team.name,
              resolved: identity
            });

            return (
                 <div key={team.id} className="grid grid-cols-[32px_1fr_80px_60px] items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-mono text-text-faint">{idx + 1}</span>
                    
                    <div className="flex items-center gap-3">
                       <img src={identity.crestUrl} alt={identity.shortName} className="w-6 h-6 object-contain" />
                       <span className="text-sm font-semibold text-text-strong">{identity.name}</span>
                    </div>

                    <div className="opacity-50">
                       <Sparkline data={team.spark.lastN} width={60} height={16} color="currentColor" />
                    </div>

                    <div className="text-right">
                       <span className="font-mono font-bold text-accent-mint">{team.momentum.score}</span>
                    </div>
                 </div>
             );
          })}
        </div>

        {/* Expand/Collapse */}
        <button 
           onClick={() => setExpanded(!expanded)}
           className="w-full text-center py-3 text-xs font-medium text-text-muted hover:text-text-strong hover:bg-white/5 transition-colors border-t border-white/5"
        >
          {expanded ? "Show Less" : `View Full 20 Teams`}
        </button>
      </div>
    </div>
  );
}
