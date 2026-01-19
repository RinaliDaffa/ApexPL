import "server-only";
// =============================================================================
// Apex PL — Manual Player Overrides (FPL ID → Wikidata QID)
// =============================================================================
// 
// For players with ambiguous or difficult-to-match names, add explicit mappings here.
// Format: [fplId]: "QID"
// 
// How to find QID:
// 1. Go to https://www.wikidata.org
// 2. Search for the player
// 3. The QID is in the URL, e.g., https://www.wikidata.org/wiki/Q615 → Q615
//

export const PLAYER_OVERRIDES: Record<number, string> = {
  // Example entries (uncomment and adjust as needed):
  // 427: "Q615",        // Cristiano Ronaldo
  // 318: "Q615",        // If there's an FPL ID conflict
  
  // Arsenal
  // 16: "Q6897855",   // Bukayo Saka
  
  // Add more as needed for ambiguous players
};

/**
 * Check if a player has a manual override
 */
export function getManualOverride(fplId: number): string | null {
  return PLAYER_OVERRIDES[fplId] || null;
}
