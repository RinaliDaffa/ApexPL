import "server-only";
// =============================================================================
// Apex PL — Player Profile Types (Wikidata-sourced)
// =============================================================================

import type { PlayerNormalized, ApiMeta } from "@/lib/types";

/**
 * Player profile data sourced from Wikidata
 */
export interface PlayerProfile {
  wikidataQid: string;
  fullName: string;
  photoUrl: string | null;
  nationality: string | null;
  dateOfBirth: string | null; // ISO date string
  age: number | null;
  heightCm: number | null;
  preferredFoot: "Left" | "Right" | "Both" | null;
  primaryPosition: string | null;
  currentClub: string | null;
}

/**
 * Squad member from Wikidata SPARQL query
 * Used for team-scoped player resolution
 */
export interface SquadMember {
  qid: string;
  label: string;          // Canonical label (full name)
  aliases: string[];      // English aliases
  dob: string | null;     // ISO date string
  nationality: string | null;
  heightCm: number | null;
  foot: "Left" | "Right" | "Both" | null;
  position: string | null;
  image: string | null;   // Raw Wikimedia filename (e.g., "Player.jpg")
}

/**
 * Combined payload for Player Detail page
 */
export interface PlayerDetailPayload {
  fplMetrics: PlayerNormalized;
  profile: PlayerProfile | null;
  highlights: string[]; // "Why he's on fire" bullets
  meta: ApiMeta;
}

/**
 * Input for resolver pipeline
 */
export interface FplPlayerInput {
  id: number;
  webName: string;
  firstName?: string;
  secondName?: string;
  teamId: number;         // FPL team ID (1-20) for team-scoped resolution
  teamShortName: string;
  teamName: string;
  position: string;
}

/**
 * Wikidata search candidate
 */
export interface WikidataCandidate {
  qid: string;
  label: string;
  description: string;
  aliases?: string[];
}

/**
 * Scored candidate for matching
 */
export interface ScoredCandidate extends WikidataCandidate {
  score: number;
  matchDetails: string[];
}

/**
 * Scored squad member for local matching
 */
export interface ScoredSquadMember extends SquadMember {
  score: number;
  matchDetails: string[];
}

