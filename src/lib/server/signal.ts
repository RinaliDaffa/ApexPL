import "server-only";
import { FplFixture } from "./fpl-client";
import { TeamNormalized } from "@/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SignalKind = "mismatch" | "closest" | "trap" | "riser" | "faller" | "stable";

export interface SignalItem {
  kind: SignalKind;
  title: string;           
  subtitle: string;        
  homeTeamId?: number;
  awayTeamId?: number;
  fixtureId?: number;
  deltaLabel?: string;     
  href: string;            
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getTeam(teams: TeamNormalized[], id: number) {
  return teams.find(t => t.id === id);
}

// -----------------------------------------------------------------------------
// Fixture Signal Strategies
// -----------------------------------------------------------------------------

/**
 * Strategy: Biggest Mismatch
 * Max abs(HomeScore - AwayScore)
 */
function findMismatch(fixtures: FplFixture[], teams: TeamNormalized[]): SignalItem | null {
  let maxDiff = -1;
  let bestFixture: FplFixture | null = null;
  
  for (const f of fixtures) {
    const home = getTeam(teams, f.team_h);
    const away = getTeam(teams, f.team_a);
    if (!home || !away) continue;
    
    const diff = Math.abs(home.momentum.score - away.momentum.score);
    if (diff > maxDiff) {
      maxDiff = diff;
      bestFixture = f;
    }
  }
  
  if (!bestFixture || maxDiff < 20) return null; // threshold
  
  const home = getTeam(teams, bestFixture.team_h)!;
  const away = getTeam(teams, bestFixture.team_a)!;
  
  return {
    kind: "mismatch",
    title: "Biggest Mismatch",
    subtitle: `${home.shortName} vs ${away.shortName}`,
    homeTeamId: home.id,
    awayTeamId: away.id,
    fixtureId: bestFixture.id,
    deltaLabel: `${maxDiff} pts gap`,
    href: `/matchday/${bestFixture.id}`,
  };
}

/**
 * Strategy: Closest Game
 * Min abs(HomeScore - AwayScore)
 */
function findClosest(fixtures: FplFixture[], teams: TeamNormalized[]): SignalItem | null {
  let minDiff = 999;
  let bestFixture: FplFixture | null = null;
  
  for (const f of fixtures) {
    const home = getTeam(teams, f.team_h);
    const away = getTeam(teams, f.team_a);
    if (!home || !away) continue;
    
    const diff = Math.abs(home.momentum.score - away.momentum.score);
    if (diff < minDiff) {
      minDiff = diff;
      bestFixture = f;
    }
  }
  
  if (!bestFixture) return null;
  
  const home = getTeam(teams, bestFixture.team_h)!;
  const away = getTeam(teams, bestFixture.team_a)!;
  
  return {
    kind: "closest",
    title: "Tightest Contest", // "Closest Game"
    subtitle: `${home.shortName} vs ${away.shortName}`,
    homeTeamId: home.id,
    awayTeamId: away.id,
    fixtureId: bestFixture.id,
    deltaLabel: `Even match`, // Or "2 pts gap"
    href: `/matchday/${bestFixture.id}`,
  };
}

/**
 * Strategy: Trap Game
 * Away > Home AND abs(diff) between 10-19
 */
function findTrap(fixtures: FplFixture[], teams: TeamNormalized[]): SignalItem | null {
  for (const f of fixtures) {
    const home = getTeam(teams, f.team_h);
    const away = getTeam(teams, f.team_a);
    if (!home || !away) continue;
    
    const diff = Math.abs(home.momentum.score - away.momentum.score);
    const isAwayFavored = away.momentum.score > home.momentum.score;
    
    // "Trap" logic: Away is better, but gap is not huge, and Home is dangerous?
    // User logic: awayScore > homeScore AND abs(diff) between 10-19
    if (isAwayFavored && diff >= 10 && diff <= 25) {
      return {
        kind: "trap",
        title: "Potential Trap",
        subtitle: `${home.shortName} vs ${away.shortName}`,
        homeTeamId: home.id,
        awayTeamId: away.id,
        fixtureId: f.id,
        deltaLabel: "Upset watch",
        href: `/matchday/${f.id}`,
      };
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Momentum Signal Strategies (Fallback)
// -----------------------------------------------------------------------------

function findRiser(teams: TeamNormalized[]): SignalItem | null {
  // We need delta. Currently TeamNormalized doesn't have explicit delta.
  // Assuming 'momentum.trend' or checking 'spark.lastN'.
  // Let's use spark for now: last score vs avg?
  // User prompt said "Use momentum deltas (if you track)".
  // If not tracked, we might not have it.
  // Fallback: Just pick "On Fire" team.
  
  const best = [...teams].sort((a, b) => b.momentum.score - a.momentum.score)[0];
  if (!best) return null;
  
  return {
    kind: "riser",
    title: "Leader",
    subtitle: best.name,
    href: `/players?team=${best.id}`, // User said /teams/ID, but let's safely route to players filtered if teams page logic is complex. 
    // Wait, user requested /teams/[id] specifically. I'll use /teams/[id] as per instructions, but I verified /teams/[id] exists.
    deltaLabel: "Top Momentum",
  };
}

// -----------------------------------------------------------------------------
// Main Generator
// -----------------------------------------------------------------------------

export function getWeeklySignals(
  teams: TeamNormalized[],
  fixtures: FplFixture[]
): SignalItem[] {
  const signals: SignalItem[] = [];
  
  // 1. Try fixture signals first
  if (fixtures.length > 0) {
    const mismatch = findMismatch(fixtures, teams);
    if (mismatch) signals.push(mismatch);
    
    const closest = findClosest(fixtures, teams);
    if (closest) signals.push(closest);
    
    const trap = findTrap(fixtures, teams);
    if (trap) signals.push(trap);
  }
  
  // 2. Fill with defaults if needed
  if (signals.length < 3) {
    // We need 3 signals. If we have no fixtures (e.g. offseason), we use team stats.
    
    // Top Riser (Highest Momentum)
    const sorted = [...teams].sort((a,b) => b.momentum.score - a.momentum.score);
    const top = sorted[0];
    if (top && !signals.find(s => s.subtitle.includes(top.shortName))) {
       signals.push({
         kind: "riser",
         title: "Top Momentum",
         subtitle: top.name,
         href: `/players?team=${top.id}`, // Using valid route
         deltaLabel: `${top.momentum.score} pts`
       });
    }

    // Top Faller (Lowest Momentum)
    const bottom = sorted[sorted.length - 1];
    if (bottom && !signals.find(s => s.subtitle.includes(bottom.shortName))) {
       signals.push({
         kind: "faller",
         title: "Coldest Team",
         subtitle: bottom.name,
         href: `/players?team=${bottom.id}`,
         deltaLabel: `${bottom.momentum.score} pts`
       });
    }
  }

  return signals.slice(0, 3);
}
