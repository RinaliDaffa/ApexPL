import "server-only";
// =============================================================================
// Apex PL — Zod Schemas for FPL Upstream Validation (Server-Only)
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// FPL Bootstrap Static Schemas
// -----------------------------------------------------------------------------

export const FplEventSchema = z.object({
  id: z.number(),
  name: z.string(),
  deadline_time: z.string(),
  finished: z.boolean(),
  is_current: z.boolean(),
  is_next: z.boolean(),
});

export const FplTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
  strength: z.number().optional().default(3),
  strength_overall_home: z.number().optional(),
  strength_overall_away: z.number().optional(),
});

export const FplElementSchema = z.object({
  id: z.number(),
  web_name: z.string(),
  first_name: z.string().optional().default(""),
  second_name: z.string().optional().default(""),
  team: z.number(),
  element_type: z.number(),
  now_cost: z.number(),
  selected_by_percent: z.string().optional().default("0"),
  transfers_in_event: z.number().optional().default(0),
  transfers_out_event: z.number().optional().default(0),
  total_points: z.number().optional().default(0),
  goals_scored: z.number().optional().default(0),
  assists: z.number().optional().default(0),
  bonus: z.number().optional().default(0),
  minutes: z.number().optional().default(0),
  form: z.string().optional().default("0"),
  ict_index: z.string().optional().default("0"),
  threat: z.string().optional().default("0"),
  creativity: z.string().optional().default("0"),
  influence: z.string().optional().default("0"),
  clean_sheets: z.number().optional().default(0),
  saves: z.number().optional().default(0),
  yellow_cards: z.number().optional().default(0),
  red_cards: z.number().optional().default(0),
});

export const FplElementTypeSchema = z.object({
  id: z.number(),
  singular_name: z.string(),
  singular_name_short: z.string(),
  plural_name: z.string().optional().default(""),
});

export const FplBootstrapStaticSchema = z.object({
  events: z.array(FplEventSchema),
  teams: z.array(FplTeamSchema),
  elements: z.array(FplElementSchema),
  element_types: z.array(FplElementTypeSchema),
});

// -----------------------------------------------------------------------------
// FPL Fixtures Schema
// -----------------------------------------------------------------------------

export const FplFixtureSchema = z.object({
  id: z.number(),
  event: z.number().nullable(),
  kickoff_time: z.string().nullable(),
  team_h: z.number(),
  team_a: z.number(),
  team_h_score: z.number().nullable(),
  team_a_score: z.number().nullable(),
  finished: z.boolean(),
  started: z.boolean().optional().default(false),
  finished_provisional: z.boolean().optional().default(false),
  team_h_difficulty: z.number().optional(),
  team_a_difficulty: z.number().optional(),
});

export const FplFixturesSchema = z.array(FplFixtureSchema);

// -----------------------------------------------------------------------------
// FPL Element Summary (Player History) Schema
// -----------------------------------------------------------------------------

export const FplPlayerHistorySchema = z.object({
  element: z.number(),
  fixture: z.number(),
  round: z.number(),
  minutes: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  bonus: z.number(),
  total_points: z.number(),
  threat: z.string().optional().default("0"),
  creativity: z.string().optional().default("0"),
  influence: z.string().optional().default("0"),
  ict_index: z.string().optional().default("0"),
  clean_sheets: z.number().optional().default(0),
  saves: z.number().optional().default(0),
  bps: z.number().optional().default(0),
});

export const FplPlayerFixtureSchema = z.object({
  event: z.number(),
  is_home: z.boolean(),
  difficulty: z.number(),
});

export const FplElementSummarySchema = z.object({
  history: z.array(FplPlayerHistorySchema),
  fixtures: z.array(FplPlayerFixtureSchema),
  history_past: z.array(z.object({
    season_name: z.string(),
    total_points: z.number(),
  })).optional().default([]),
});

// -----------------------------------------------------------------------------
// App-level Normalized Schemas (for API responses)
// -----------------------------------------------------------------------------

export const ApiMetaSchema = z.object({
  lastUpdated: z.string(),
  sourceStatus: z.enum(["fresh", "stale"]),
});

export const MomentumLabelSchema = z.enum(["On Fire", "Rising", "Cooling", "Unstable"]);
export const TrendDirectionSchema = z.enum(["up", "down", "flat"]);
export const PlayerPositionSchema = z.enum(["GKP", "DEF", "MID", "FWD"]);
export const PlayerTagSchema = z.enum(["Undervalued", "Overhyped", "Trending", "Reliable"]);
export const SortKeySchema = z.enum(["threat", "creativity", "value", "form"]);

// Query params validation
export const PlayersQuerySchema = z.object({
  sort: SortKeySchema.optional(),
  position: PlayerPositionSchema.optional(),
  team: z.coerce.number().optional(),
  minMins: z.coerce.number().optional(),
});

export const FixturesQuerySchema = z.object({
  event: z.coerce.number().optional(),
});

export const CompareQuerySchema = z.object({
  a: z.coerce.number(),
  b: z.coerce.number(),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type FplBootstrapStaticValidated = z.infer<typeof FplBootstrapStaticSchema>;
export type FplFixtureValidated = z.infer<typeof FplFixtureSchema>;
export type FplElementSummaryValidated = z.infer<typeof FplElementSummarySchema>;
export type FplElementValidated = z.infer<typeof FplElementSchema>;
export type FplTeamValidated = z.infer<typeof FplTeamSchema>;
