import "server-only";
// =============================================================================
// Apex PL — PL Team to Wikidata QID Mappings
// =============================================================================
//
// Maps FPL teamId to Wikidata QID for SPARQL squad fetching.
// Based on 2024-25 Premier League season teams.
//
// How to find QIDs:
// 1) Go to https://www.wikidata.org
// 2) Search for the club name
// 3) QID is in the URL, e.g., https://www.wikidata.org/wiki/Q19794 → Q19794
//

/**
 * FPL teamId → Wikidata QID mapping for all 20 PL teams
 * 
 * FPL teamIds are stable within a season but team names may change.
 * Verify against bootstrap-static if issues arise.
 */
export const TEAM_QIDS: Record<number, string> = {
  // Arsenal
  1: "Q9617",
  // Aston Villa
  2: "Q19794",
  // Bournemouth
  3: "Q19609",
  // Brentford
  4: "Q19571",
  // Brighton & Hove Albion
  5: "Q127682",
  // Chelsea
  6: "Q9616",
  // Crystal Palace
  7: "Q18519",
  // Everton
  8: "Q19596",
  // Fulham
  9: "Q19560",
  // Ipswich Town
  10: "Q18517",
  // Leicester City
  11: "Q19583",
  // Liverpool
  12: "Q1130849",
  // Man City
  13: "Q50602",
  // Man Utd
  14: "Q18656",
  // Newcastle
  15: "Q1032632",
  // Nott'm Forest
  16: "Q19543",
  // Southampton
  17: "Q10876",
  // Spurs
  18: "Q18741",
  // West Ham
  19: "Q16216",
  // Wolves
  20: "Q19550",
};

/**
 * Get Wikidata QID for a PL team
 * @param teamId FPL team ID (1-20)
 * @returns Wikidata QID string or null if not found
 */
export function getTeamQid(teamId: number): string | null {
  return TEAM_QIDS[teamId] ?? null;
}

/**
 * Check if a team is a valid PL team with a QID mapping
 */
export function isPlTeam(teamId: number): boolean {
  return teamId in TEAM_QIDS;
}
