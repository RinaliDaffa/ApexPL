// =============================================================================
// Apex PL — Normalized Types
// =============================================================================

// Meta (attached to all API responses)
export interface ApiMeta {
  lastUpdated: string;
  sourceStatus: "fresh" | "stale";
  currentEvent?: number;
  requestedEvent?: number;
  resolvedEvent?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

// Team Types
export type MomentumLabel = "On Fire" | "Rising" | "Cooling" | "Unstable" | "Watchlist" | "Stable";
export type TrendDirection = "up" | "down" | "flat";

export interface TeamMomentum {
  score: number;
  label: MomentumLabel;
  trend: TrendDirection;
}

export interface TeamNormalized {
  id: number;
  code: number; // FPL team.code for crest URLs
  name: string;
  shortName: string;
  momentum: TeamMomentum;
  spark: { lastN: number[] };
  chips: string[];
}

export interface TeamDriver {
  title: string;
  insight: string;
  type: "attack" | "defense" | "form";
  score: number; // 0-100 for strip visualization
}

export interface TeamFocus {
  team: TeamNormalized;
  drivers: TeamDriver[];
  players: PlayerNormalized[];
}

// Player Types
export type PlayerPosition = "GKP" | "DEF" | "MID" | "FWD";
export type PlayerTag = "Undervalued" | "Overhyped" | "Trending" | "Reliable";
export type SortKey = "threat" | "creativity" | "value" | "form";

export interface PlayerFeatures {
  threat: number;
  creativity: number;
  value: number;
  form: number;
}

export interface PlayerNormalized {
  id: number;
  name: string;
  photo: string | null; // FPL photo code (e.g., "123456.jpg")
  teamId: number;
  teamCode: number;
  teamShortName: string;
  position: PlayerPosition;
  tags: PlayerTag[];
  hype: { score: number };
  reality: { score: number };
  features: PlayerFeatures;
  chips: string[];
}

// Compare Types
export interface ComparePayload {
  playerA: PlayerNormalized;
  playerB: PlayerNormalized;
  keyDifferences: string[];
  radarDimensions: SortKey[]; // Keys: ["threat", "creativity", "value", "form"]
  radarLabels: string[]; // UI labels: ["Threat", "Creativity", "Value", "Form"]
}

// Fixture Types
export type NarrativeTag =
  | "Closer Than It Looks"
  | "Trap Game"
  | "Momentum Clash"
  | "Momentum Mismatch"
  | "Momentum Pending"
  | "Could Get Chaotic"
  | "Form Collision";

export interface FixtureTeam {
  id: number;
  code: number; // FPL team.code for crest URLs
  shortName: string;
}

export interface MomentumContrast {
  homeScore: number | null;
  awayScore: number | null;
}

export interface FixtureNormalized {
  id: number;
  event: number;
  kickoffTime: string;
  finished: boolean;
  started: boolean;
  homeScore?: number;
  awayScore?: number;
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  momentumContrast: MomentumContrast;
  narrativeTag: NarrativeTag | string;
}

// Query Params
export interface PlayersQueryParams {
  sort?: SortKey;
  position?: PlayerPosition;
  team?: number;
  minMins?: number;
}

export interface FixturesQueryParams {
  event?: number;
}
