import "server-only";
// =============================================================================
// Apex PL — Normalization Utilities (Server-Only)
// =============================================================================

import type {
  TeamNormalized,
  PlayerNormalized,
  FixtureNormalized,
  TeamFocus,
  TeamDriver,
  PlayerPosition,
} from "../types";
import type { FplBootstrapStatic, FplFixture } from "./fpl-client";
import {
  calculateHypeScore,
  calculateRealityScore,
  calculateFeatures,
  calculateTeamMomentum,
  getMomentumLabel,
  assignPlayerTags,
  generatePlayerChips,
  generateTeamChips,
  generateNarrativeTag,
  percentileRank,
  type TeamMomentumInputs,
  type HypeInputs,
  type RealityInputs,
  type FeatureInputs,
} from "./scoring";

// -----------------------------------------------------------------------------
// Position Mapping
// -----------------------------------------------------------------------------

const POSITION_MAP: Record<number, PlayerPosition> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

// -----------------------------------------------------------------------------
// Team Stats from Fixtures
// -----------------------------------------------------------------------------

interface TeamStats {
  points: number;
  gf: number;
  ga: number;
  cs: number;
  fixtureCount: number;
  results: Array<"W" | "D" | "L">;
}

function computeTeamStats(
  teamId: number,
  fixtures: FplFixture[],
  windowSize = 5
): TeamStats {
  const stats: TeamStats = { points: 0, gf: 0, ga: 0, cs: 0, fixtureCount: 0, results: [] };

  // Get finished fixtures involving this team, sorted by recency
  const teamFixtures = fixtures
    .filter((f) => f.finished && (f.team_h === teamId || f.team_a === teamId))
    .slice(-windowSize);

  for (const f of teamFixtures) {
    const isHome = f.team_h === teamId;
    const scored = isHome ? f.team_h_score ?? 0 : f.team_a_score ?? 0;
    const conceded = isHome ? f.team_a_score ?? 0 : f.team_h_score ?? 0;

    stats.gf += scored;
    stats.ga += conceded;
    stats.fixtureCount++;

    if (conceded === 0) stats.cs++;

    if (scored > conceded) {
      stats.points += 3;
      stats.results.push("W");
    } else if (scored === conceded) {
      stats.points += 1;
      stats.results.push("D");
    } else {
      stats.results.push("L");
    }
  }

  return stats;
}

// -----------------------------------------------------------------------------
// Normalize Teams
// -----------------------------------------------------------------------------

export function normalizeTeams(
  bootstrap: FplBootstrapStatic,
  fixtures: FplFixture[]
): TeamNormalized[] {
  // Compute stats for all teams
  const teamStatsMap = new Map<number, TeamStats>();
  for (const team of bootstrap.teams) {
    teamStatsMap.set(team.id, computeTeamStats(team.id, fixtures));
  }

  // Convert to momentum inputs
  const allMomentumInputs: TeamMomentumInputs[] = Array.from(teamStatsMap.values()).map((s) => ({
    formPoints: s.points,
    goalsFor: s.gf,
    goalsAgainst: s.ga,
    cleanSheets: s.cs,
    recentFixtureCount: s.fixtureCount,
  }));

  const teams: TeamNormalized[] = [];

  for (const fplTeam of bootstrap.teams) {
    const stats = teamStatsMap.get(fplTeam.id)!;
    const momentumInputs: TeamMomentumInputs = {
      formPoints: stats.points,
      goalsFor: stats.gf,
      goalsAgainst: stats.ga,
      cleanSheets: stats.cs,
      recentFixtureCount: stats.fixtureCount,
    };

    const score = calculateTeamMomentum(momentumInputs, allMomentumInputs);
    const label = getMomentumLabel(score);
    const chips = generateTeamChips(score, stats.gf, stats.ga, stats.cs, stats.fixtureCount);

    // Spark: convert results to point values
    const sparkPoints = stats.results.map((r) => (r === "W" ? 3 : r === "D" ? 1 : 0));

    teams.push({
      id: fplTeam.id,
      name: fplTeam.name,
      shortName: fplTeam.short_name,
      momentum: {
        score,
        label,
        trend: "flat", // Would need previous snapshot for real trend
      },
      spark: { lastN: sparkPoints.length > 0 ? sparkPoints : [0] },
      chips,
    });
  }

  // Sort by momentum score descending
  return teams.sort((a, b) => b.momentum.score - a.momentum.score);
}

// -----------------------------------------------------------------------------
// Normalize Players
// -----------------------------------------------------------------------------

export function normalizePlayers(bootstrap: FplBootstrapStatic): PlayerNormalized[] {
  const teamMap = new Map(bootstrap.teams.map((t) => [t.id, t]));

  // Prepare scoring inputs
  const hypeInputs: HypeInputs[] = bootstrap.elements.map((e) => ({
    selectedByPercent: parseFloat(e.selected_by_percent) || 0,
    transfersIn: e.transfers_in_event,
    transfersOut: e.transfers_out_event,
    nowCost: e.now_cost,
  }));

  const realityInputs: RealityInputs[] = bootstrap.elements.map((e) => ({
    totalPoints: e.total_points,
    minutes: e.minutes,
    goalsScored: e.goals_scored,
    assists: e.assists,
    bonus: e.bonus,
    cleanSheets: e.clean_sheets ?? 0,
    position: e.element_type,
  }));

  const featureInputs: FeatureInputs[] = bootstrap.elements.map((e) => ({
    threat: parseFloat(e.threat) || 0,
    creativity: parseFloat(e.creativity) || 0,
    influence: parseFloat(e.influence) || 0,
    form: parseFloat(e.form) || 0,
    nowCost: e.now_cost,
    totalPoints: e.total_points,
    minutes: e.minutes,
  }));

  const netTransfers = bootstrap.elements.map((e) => e.transfers_in_event - e.transfers_out_event);

  return bootstrap.elements.map((element, index) => {
    const team = teamMap.get(element.team);
    
    const hypeScore = calculateHypeScore(hypeInputs[index], hypeInputs);
    const realityScore = calculateRealityScore(realityInputs[index], realityInputs);
    const features = calculateFeatures(featureInputs[index], featureInputs);

    const netTransferRank = percentileRank(
      element.transfers_in_event - element.transfers_out_event,
      netTransfers
    );

    const tags = assignPlayerTags(hypeScore, realityScore, netTransferRank);
    const chips = generatePlayerChips(features, hypeScore, realityScore);

    return {
      id: element.id,
      name: element.web_name,
      teamId: element.team,
      teamShortName: team?.short_name ?? "???",
      position: POSITION_MAP[element.element_type] ?? "MID",
      tags,
      hype: { score: hypeScore },
      reality: { score: realityScore },
      features,
      chips,
    };
  });
}

// -----------------------------------------------------------------------------
// Normalize Fixtures
// -----------------------------------------------------------------------------

// Type guard for finite number
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

// Clamp to 0-100
function clampMomentum(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeFixtures(
  fixtures: FplFixture[],
  teams: TeamNormalized[],
  filterNullKickoff = true
): FixtureNormalized[] {
  // Build map keyed by team ID (number) - CRITICAL for correct lookup
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Include ALL fixtures (finished and upcoming)
  // Only filter out null kickoff times for display purposes
  const fixturesWithData = filterNullKickoff 
    ? fixtures.filter((f) => f.kickoff_time)
    : fixtures;

  return fixturesWithData
    .map((fixture) => {
      // Lookup by team_h and team_a (which are numbers)
      const homeTeam = teamMap.get(fixture.team_h);
      const awayTeam = teamMap.get(fixture.team_a);

      // Get momentum scores with proper null handling - NEVER use 50 fallback!
      const rawHomeMomentum = homeTeam?.momentum?.score;
      const rawAwayMomentum = awayTeam?.momentum?.score;

      // Only use score if it's a finite number, otherwise null
      const homeMomentum = isFiniteNumber(rawHomeMomentum) ? clampMomentum(rawHomeMomentum) : null;
      const awayMomentum = isFiniteNumber(rawAwayMomentum) ? clampMomentum(rawAwayMomentum) : null;

      // Generate narrative tag only if both scores are valid
      const narrativeTag = 
        homeMomentum !== null && awayMomentum !== null
          ? generateNarrativeTag(homeMomentum, awayMomentum)
          : "Momentum Pending";

      return {
        id: fixture.id,
        event: fixture.event ?? 0,
        kickoffTime: fixture.kickoff_time ?? "",
        finished: fixture.finished,
        started: fixture.started ?? false,
        homeScore: fixture.team_h_score ?? undefined,
        awayScore: fixture.team_a_score ?? undefined,
        homeTeam: {
          id: fixture.team_h,
          shortName: homeTeam?.shortName ?? "???",
        },
        awayTeam: {
          id: fixture.team_a,
          shortName: awayTeam?.shortName ?? "???",
        },
        momentumContrast: {
          homeScore: homeMomentum,
          awayScore: awayMomentum,
        },
        narrativeTag,
      };
    })
    .sort((a, b) => {
      // Sort by kickoff time, with empty strings at the end
      if (!a.kickoffTime && !b.kickoffTime) return 0;
      if (!a.kickoffTime) return 1;
      if (!b.kickoffTime) return -1;
      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    });
}

// -----------------------------------------------------------------------------
// Generate Team Focus (with drivers)
// -----------------------------------------------------------------------------

export function generateTeamFocus(
  team: TeamNormalized,
  allPlayers: PlayerNormalized[],
  _fixtures: FplFixture[]
): TeamFocus {
  // Get team's players sorted by reality
  const teamPlayers = allPlayers
    .filter((p) => p.teamId === team.id)
    .sort((a, b) => b.reality.score - a.reality.score);

  // Generate 3 drivers
  const drivers: TeamDriver[] = [];

  // Driver 1: Form/Momentum summary
  drivers.push({
    title: team.momentum.label === "On Fire" ? "Momentum Surge" : "Current Form",
    insight: `${team.momentum.label} with score ${team.momentum.score}/100. ${team.chips[0] ?? "Building rhythm."}`,
    type: "form",
    score: team.momentum.score,
  });

  // Driver 2: Attack analysis - find player with highest threat
  const attackPlayers = teamPlayers
    .filter((p) => p.position === "MID" || p.position === "FWD")
    .sort((a, b) => b.features.threat - a.features.threat);
  const topAttacker = attackPlayers[0];
  const attackScore = topAttacker?.features.threat ?? 50;
  drivers.push({
    title: "Attacking Threat",
    insight: topAttacker
      ? `${topAttacker.name} leading with ${attackScore}/100 threat rating`
      : "Spread attacking threat across the squad",
    type: "attack",
    score: attackScore,
  });

  // Driver 3: Defense analysis - find best defender by reality score
  const defPlayers = teamPlayers
    .filter((p) => p.position === "DEF" || p.position === "GKP")
    .sort((a, b) => b.reality.score - a.reality.score);
  const topDefender = defPlayers[0];
  const defenseScore = topDefender?.reality.score ?? 50;
  drivers.push({
    title: "Defensive Stability",
    insight: topDefender
      ? `${topDefender.name} anchoring defense with ${defenseScore}/100 reality score`
      : "Defensive unit averaging " + defenseScore + "/100",
    type: "defense",
    score: defenseScore,
  });

  return {
    team,
    drivers,
    players: teamPlayers.slice(0, 8), // Top 8 contributors
  };
}
