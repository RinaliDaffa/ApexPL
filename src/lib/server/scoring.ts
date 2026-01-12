import "server-only";
// =============================================================================
// Apex PL — Scoring Utilities (Server-Only)
// =============================================================================

import type { MomentumLabel, TrendDirection, PlayerTag, PlayerFeatures } from "../types";

// -----------------------------------------------------------------------------
// Core Utilities
// -----------------------------------------------------------------------------

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function percentileRank(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.filter((v) => v < value).length;
  return clampScore((count / sorted.length) * 100);
}

export function normalizeToScale(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clampScore(((value - min) / (max - min)) * 100);
}

// -----------------------------------------------------------------------------
// Hype Score (from bootstrap data)
// -----------------------------------------------------------------------------

export interface HypeInputs {
  selectedByPercent: number;
  transfersIn: number;
  transfersOut: number;
  nowCost: number;
}

export function calculateHypeScore(inputs: HypeInputs, allPlayers: HypeInputs[]): number {
  const ownership = allPlayers.map((p) => p.selectedByPercent);
  const netTransfers = allPlayers.map((p) => p.transfersIn - p.transfersOut);
  const prices = allPlayers.map((p) => p.nowCost);

  const ownershipScore = percentileRank(inputs.selectedByPercent, ownership);
  const netTransferScore = percentileRank(inputs.transfersIn - inputs.transfersOut, netTransfers);
  const priceScore = percentileRank(inputs.nowCost, prices);

  // Weights: ownership 45%, net transfers 35%, price 20%
  return clampScore(ownershipScore * 0.45 + netTransferScore * 0.35 + priceScore * 0.2);
}

// -----------------------------------------------------------------------------
// Reality Score (from bootstrap totals - coarse approximation)
// -----------------------------------------------------------------------------

export interface RealityInputs {
  totalPoints: number;
  minutes: number;
  goalsScored: number;
  assists: number;
  bonus: number;
  cleanSheets: number;
  position: number; // 1=GKP, 2=DEF, 3=MID, 4=FWD
}

export function calculateRealityScore(inputs: RealityInputs, allPlayers: RealityInputs[]): number {
  // Filter to same position for fairer comparison
  const positionPlayers = allPlayers.filter((p) => p.position === inputs.position);
  const comparePlayers = positionPlayers.length > 10 ? positionPlayers : allPlayers;

  // Points per minute (avoid division by zero)
  const ppm = inputs.minutes > 0 ? inputs.totalPoints / inputs.minutes : 0;
  const allPPM = comparePlayers.filter((p) => p.minutes > 0).map((p) => p.totalPoints / p.minutes);
  const ppmScore = percentileRank(ppm, allPPM);

  // Attacking contribution (weighted by position)
  const attackWeight = inputs.position === 4 ? 0.5 : inputs.position === 3 ? 0.4 : 0.2;
  const attack = inputs.goalsScored * 4 + inputs.assists * 3 + inputs.bonus;
  const allAttack = comparePlayers.map((p) => p.goalsScored * 4 + p.assists * 3 + p.bonus);
  const attackScore = percentileRank(attack, allAttack);

  // Defensive contribution (weighted by position)
  const defenseWeight = inputs.position <= 2 ? 0.3 : 0.1;
  const allCS = comparePlayers.map((p) => p.cleanSheets);
  const csScore = percentileRank(inputs.cleanSheets, allCS);

  // Combine with position-aware weights
  const consistencyWeight = 1 - attackWeight - defenseWeight;
  return clampScore(
    ppmScore * consistencyWeight + attackScore * attackWeight + csScore * defenseWeight
  );
}

// -----------------------------------------------------------------------------
// Feature Dimensions (from bootstrap data)
// -----------------------------------------------------------------------------

export interface FeatureInputs {
  threat: number;
  creativity: number;
  influence: number;
  form: number;
  nowCost: number;
  totalPoints: number;
  minutes: number;
}

export function calculateFeatures(
  inputs: FeatureInputs,
  allPlayers: FeatureInputs[]
): PlayerFeatures {
  // Threat: raw ICT threat percentile
  const threatScore = percentileRank(
    inputs.threat,
    allPlayers.map((p) => p.threat)
  );

  // Creativity: raw ICT creativity percentile
  const creativityScore = percentileRank(
    inputs.creativity,
    allPlayers.map((p) => p.creativity)
  );

  // Form: recent form (already a per-game metric in FPL)
  const formScore = clampScore(inputs.form * 10); // form is typically 0-10

  // Value: points per cost ratio
  const costInMillions = inputs.nowCost / 10;
  const valueRatio = costInMillions > 0 ? inputs.totalPoints / costInMillions : 0;
  const allValueRatios = allPlayers
    .filter((p) => p.nowCost > 0)
    .map((p) => p.totalPoints / (p.nowCost / 10));
  const valueScore = percentileRank(valueRatio, allValueRatios);

  return {
    threat: threatScore,
    creativity: creativityScore,
    value: valueScore,
    form: formScore,
  };
}

// -----------------------------------------------------------------------------
// Team Momentum
// -----------------------------------------------------------------------------

export interface TeamMomentumInputs {
  formPoints: number; // Last 5 games: W=3, D=1, L=0 (max 15)
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  recentFixtureCount: number; // How many recent fixtures we have data for
}

export function calculateTeamMomentum(
  inputs: TeamMomentumInputs,
  allTeams: TeamMomentumInputs[]
): number {
  // Form: normalize 0-15 to 0-100
  const formScore = normalizeToScale(inputs.formPoints, 0, Math.min(inputs.recentFixtureCount * 3, 15));

  // Goal trend
  const goalDiff = inputs.goalsFor - inputs.goalsAgainst;
  const allGoalDiffs = allTeams.map((t) => t.goalsFor - t.goalsAgainst);
  const goalTrendScore = percentileRank(goalDiff, allGoalDiffs);

  // Attack output
  const allGF = allTeams.map((t) => t.goalsFor);
  const attackScore = percentileRank(inputs.goalsFor, allGF);

  // Defense
  const defenseScore = normalizeToScale(inputs.cleanSheets, 0, inputs.recentFixtureCount);

  // Weights: form 35%, goal trend 25%, attack 25%, defense 15%
  return clampScore(
    formScore * 0.35 + goalTrendScore * 0.25 + attackScore * 0.25 + defenseScore * 0.15
  );
}

export function getMomentumLabel(score: number, variance?: number): MomentumLabel {
  if (score >= 75) return "On Fire";
  if (score >= 60) return "Rising";
  if (score >= 40) {
    if (variance !== undefined && variance > 20) return "Unstable";
    return "Unstable";
  }
  return "Cooling";
}

export function getTrendDirection(current: number, previous: number): TrendDirection {
  const delta = current - previous;
  if (delta > 5) return "up";
  if (delta < -5) return "down";
  return "flat";
}

// -----------------------------------------------------------------------------
// Player Tags
// -----------------------------------------------------------------------------

export function assignPlayerTags(
  hype: number,
  reality: number,
  netTransferRank: number
): PlayerTag[] {
  const tags: PlayerTag[] = [];

  // Undervalued: good reality, low hype
  if (reality >= 55 && hype < 40) tags.push("Undervalued");

  // Overhyped: high hype, low reality
  if (hype >= 60 && reality < 45) tags.push("Overhyped");

  // Trending: high transfer activity
  if (netTransferRank >= 75) tags.push("Trending");

  // Reliable: balanced good scores
  if (reality >= 50 && hype >= 35 && hype <= 75 && tags.length === 0) {
    tags.push("Reliable");
  }

  return tags.length > 0 ? tags : ["Reliable"];
}

// -----------------------------------------------------------------------------
// Chip Generation
// -----------------------------------------------------------------------------

export function generatePlayerChips(
  features: PlayerFeatures,
  hype: number,
  reality: number
): string[] {
  const chips: string[] = [];

  if (features.form >= 70) chips.push("Hot form");
  if (features.value >= 75) chips.push("Great value");
  if (features.threat >= 75) chips.push("Goal threat");
  if (features.creativity >= 75) chips.push("Creative force");
  if (hype > reality + 15) chips.push("Price risk");
  if (reality > hype + 15) chips.push("Under radar");
  if (features.form < 30) chips.push("Out of form");

  return chips.slice(0, 3);
}

export function generateTeamChips(
  score: number,
  gf: number,
  ga: number,
  cs: number,
  fixtureCount: number
): string[] {
  const chips: string[] = [];
  const avgGF = gf / Math.max(fixtureCount, 1);
  const avgGA = ga / Math.max(fixtureCount, 1);

  if (avgGF >= 1.5) chips.push("Goals flowing");
  if (cs >= Math.ceil(fixtureCount * 0.4)) chips.push("Solid defense");
  if (avgGA >= 2) chips.push("Leaky at back");
  if (score >= 75) chips.push("Peak form");
  if (score >= 60 && score < 75) chips.push("Building momentum");
  if (score < 40) chips.push("Struggling");

  return chips.slice(0, 3);
}

// -----------------------------------------------------------------------------
// Narrative Tag for Fixtures
// -----------------------------------------------------------------------------

export function generateNarrativeTag(homeMomentum: number, awayMomentum: number): string {
  const diff = Math.abs(homeMomentum - awayMomentum);
  const avg = (homeMomentum + awayMomentum) / 2;

  if (diff < 10) return "Closer Than It Looks";
  if (homeMomentum >= 70 && awayMomentum >= 70) return "Momentum Clash";
  if (homeMomentum < 40 && awayMomentum < 40) return "Could Get Chaotic";
  if (diff >= 25) return "Trap Game";
  if (avg >= 60) return "Form Collision";
  return "Unpredictable";
}

// -----------------------------------------------------------------------------
// Key Differences for Compare
// -----------------------------------------------------------------------------

export function generateKeyDifferences(
  featuresA: PlayerFeatures,
  featuresB: PlayerFeatures,
  nameA: string,
  nameB: string
): string[] {
  const dims: Array<{ key: keyof PlayerFeatures; label: string }> = [
    { key: "threat", label: "goal threat" },
    { key: "creativity", label: "creativity" },
    { key: "value", label: "value" },
    { key: "form", label: "form" },
  ];

  const deltas = dims.map(({ key, label }) => ({
    key,
    label,
    delta: featuresA[key] - featuresB[key],
  }));

  // Sort by absolute delta
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const differences: string[] = [];

  for (const { label, delta } of deltas.slice(0, 3)) {
    if (Math.abs(delta) >= 10) {
      const better = delta > 0 ? nameA : nameB;
      const margin = Math.abs(delta) >= 25 ? "significantly" : "notably";
      differences.push(`${better} has ${margin} higher ${label}`);
    }
  }

  if (differences.length === 0) {
    differences.push("Very similar profiles across all dimensions");
  }

  return differences;
}
