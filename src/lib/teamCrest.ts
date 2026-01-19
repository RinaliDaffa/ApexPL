/**
 * Team Crest utilities for ApexPL.
 * Uses FPL's official Premier League resources for team crests.
 * 
 */
// Canonical mapping: FPL Team ID -> Team Code (for badges)
// Matches the Hybrid/Historical Dataset detected in the user's project.
const CANONICAL_CREST_MAP: Record<number, number> = {
  1: 3,    // Arsenal
  2: 7,    // Aston Villa
  3: 90,   // Burnley (Historical)
  4: 91,   // Bournemouth
  5: 94,   // Brentford
  6: 36,   // Brighton
  7: 8,    // Chelsea
  8: 31,   // Crystal Palace
  9: 11,   // Everton
  10: 54,  // Fulham
  11: 2,   // Leeds (Historical)
  12: 14,  // Liverpool
  13: 43,  // Man City
  14: 1,   // Man Utd
  15: 4,   // Newcastle
  16: 17,  // Nott'm Forest
  17: 56,  // Sunderland (Historical)
  18: 6,   // Spurs
  19: 21,  // West Ham
  20: 39,  // Wolves
};

/**
 * Get the crest URL for a team using its FPL Team Code.
 * @deprecated Use getTeamCrestUrlById for stricter compliance.
 */
export function getTeamCrestUrl(code: number): string {
    return `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`;
}

/**
 * Get the crest URL directly from the FPL Team ID using the canonical map.
 * This ensures badges match the team identity defined in teamDirectory.ts.
 */
export function getTeamCrestUrlById(id: number): string {
  const code = CANONICAL_CREST_MAP[id];
  if (!code) {
    if (process.env.NODE_ENV === "development" && id <= 20) {
      console.warn(`[crest-missing] Missing canonical code for Team ID ${id}`);
    }
    // Fallback? Or empty.
    return "";
  }
  return `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`;
}

export function getTeamCrestUrlLargeById(id: number): string {
  const code = CANONICAL_CREST_MAP[id];
  if (!code) return "";
  return `https://resources.premierleague.com/premierleague/badges/100/t${code}.png`;
}
