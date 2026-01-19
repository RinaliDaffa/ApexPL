import Link from "next/link";
import { TeamNormalized } from "@/lib/types";
import { getTeamIdentity } from "@/lib/teamDirectory";
import { assertTeamIdentity } from "@/lib/devAssert";

interface SignalStripProps {
  teams: TeamNormalized[];
}

export function SignalStrip({ teams }: SignalStripProps) {
  if (!teams || teams.length === 0) return null;

  // Derive Signals Client-side (Single Source of Truth)

  // 1. Hot Streak: Highest Momentum Score
  const hotTeam = teams[0];
  
  // 2. Most Volatile
  const getVolatilityScore = (t: TeamNormalized) => {
    const nums = t.spark.lastN;
    if (!nums.length) return 0;
    return Math.max(...nums) - Math.min(...nums);
  };
  const volatileTeam = [...teams].sort((a, b) => getVolatilityScore(b) - getVolatilityScore(a))[0];

  // 3. Quiet Riser
  const midTable = teams.slice(5, 15);
  const getSlope = (t: TeamNormalized) => {
     const nums = t.spark.lastN;
     if (nums.length < 2) return 0;
     return nums[nums.length-1] - nums[0];
  };
  const quietRiser = [...midTable].sort((a,b) => getSlope(b) - getSlope(a))[0];

  const signals = [
    {
      label: "Hot Streak",
      team: hotTeam,
      metric: `${hotTeam.momentum.score}/100`,
      barColor: "bg-accent-mint"
    },
    {
      label: "Most Volatile",
      team: volatileTeam,
      metric: "High Swing",
      barColor: "bg-status-unstable"
    },
    {
      label: "Quiet Riser",
      team: quietRiser || teams[1],
      metric: "Trending Up",
      barColor: "bg-status-rising"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {signals.map((item, i) => {
        // Resolve Identity STRICTLY from ID
        const identity = getTeamIdentity(item.team.id);
            
        // DEV-ONLY Assertion
        // @ts-ignore - explicitly passing potentially loose data for checking
        assertTeamIdentity({
          surface: "Snapshot/SignalStrip",
          rowTeamId: item.team.id,
          rowShortName: item.team.shortName,
          rowName: item.team.name,
          resolved: identity
        });

        // const crestUrl = identity.crestUrl; // Unused

        return (
            <div 
              key={i} 
              className="group relative flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Link href={`/teams/${identity.id}`} className="absolute inset-0 z-10" aria-label={`View ${identity.name}`} />
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={identity.crestUrl} alt={identity.shortName} className="w-8 h-8 object-contain" />
                  <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-bg-0 ${item.barColor}`} />
                </div>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-faint group-hover:text-text-muted transition-colors">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-text-strong group-hover:text-white">
                    {identity.shortName}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono text-text-muted bg-black/20 px-1.5 py-0.5 rounded group-hover:bg-black/40 transition-colors">
                  {item.metric}
                </span>
              </div>
            </div>
        );
      })}
    </div>
  );
}
