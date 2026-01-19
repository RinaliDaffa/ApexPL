import { TeamIdentity } from "./teamDirectory";

/**
 * Validates that a UI component is rendering the correct team identity
 * by comparing the row data against the canonical resolved identity.
 */
export function assertTeamIdentity(params: {
  surface: string;          // e.g. "Snapshot/HotStreak"
  rowTeamId?: number | null;
  rowShortName?: string | null;
  rowName?: string | null;
  resolved?: TeamIdentity | null;
  bootstrap?: { teamId: number; shortName: string; name: string } | null;
}) {
  // Production optimization completely removes this code
  if (process.env.NODE_ENV === "production") return;

  const { surface, rowTeamId, rowShortName, rowName, resolved, bootstrap } = params;

  // Print diagnostic for every row render to trace data flow
  console.debug(`[TEAM_ASSERT] ${surface}`, {
    rowTeamId, 
    rowShortName, 
    rowName,
    resolved: resolved ? { teamId: resolved.id, shortName: resolved.shortName, name: resolved.name, crestUrl: resolved.crestUrl } : null,
    bootstrap: bootstrap ? { teamId: bootstrap.teamId, shortName: bootstrap.shortName, name: bootstrap.name } : null,
  });

  // If teamId is missing or doesn’t exist in directory → warn loudly
  if (!rowTeamId || !resolved) {
    console.warn(`[TEAM_ASSERT_MISSING] ${surface} missing/invalid teamId`, { rowTeamId, rowShortName, rowName });
  }

  // If rowShortName exists and conflicts with resolved.shortName → explicit mismatch
  if (rowShortName && resolved && rowShortName !== resolved.shortName) {
    // Allow some fuzzy matching if needed, but strict is better.
    // e.g. "Man Utd" vs "Man United" might occur in name, but shortName "MUN" should be exact.
    console.error(`[TEAM_ASSERT_MISMATCH] ${surface} shortName mismatch`, { 
      suppliedShort: rowShortName, 
      resolvedShort: resolved.shortName, 
      rowTeamId 
    });
  }
}
