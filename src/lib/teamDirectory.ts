import { getTeamCrestUrlById } from "./teamCrest";

export interface TeamIdentity {
  id: number;
  name: string;
  shortName: string;
  crestUrl: string;
}

// Canonical mapping of FPL Team ID to Name/ShortName.
// VERIFIED via live API dump (Hybrid/Historical Dataset detected: Burnley, Leeds, Sunderland present).
export const TEAM_DIRECTORY: Record<number, Omit<TeamIdentity, "crestUrl">> = {
  1: { id: 1, name: "Arsenal", shortName: "ARS" },
  2: { id: 2, name: "Aston Villa", shortName: "AVL" },
  3: { id: 3, name: "Burnley", shortName: "BUR" },
  4: { id: 4, name: "Bournemouth", shortName: "BOU" },
  5: { id: 5, name: "Brentford", shortName: "BRE" },
  6: { id: 6, name: "Brighton", shortName: "BHA" },
  7: { id: 7, name: "Chelsea", shortName: "CHE" },
  8: { id: 8, name: "Crystal Palace", shortName: "CRY" },
  9: { id: 9, name: "Everton", shortName: "EVE" },
  10: { id: 10, name: "Fulham", shortName: "FUL" },
  11: { id: 11, name: "Leeds", shortName: "LEE" },
  12: { id: 12, name: "Liverpool", shortName: "LIV" },
  13: { id: 13, name: "Man City", shortName: "MCI" },
  14: { id: 14, name: "Man Utd", shortName: "MUN" },
  15: { id: 15, name: "Newcastle", shortName: "NEW" },
  16: { id: 16, name: "Nott'm Forest", shortName: "NFO" },
  17: { id: 17, name: "Sunderland", shortName: "SUN" },
  18: { id: 18, name: "Spurs", shortName: "TOT" },
  19: { id: 19, name: "West Ham", shortName: "WHU" },
  20: { id: 20, name: "Wolves", shortName: "WOL" },
};

export function getTeamIdentity(teamId: number): TeamIdentity {
  const crestUrl = getTeamCrestUrlById(teamId);
  
  const directoryEntry = TEAM_DIRECTORY[teamId];
  
  if (!directoryEntry) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[teamDirectory] Unknown teamId: ${teamId}`);
    }
    return {
      id: teamId,
      name: `Team ${teamId}`,
      shortName: "UNK",
      crestUrl
    };
  }

  return {
    ...directoryEntry,
    crestUrl
  };
}

export function assertTeamId(id: unknown): number {
  if (typeof id === 'number' && !isNaN(id) && id > 0) {
     return id;
  }
  if (process.env.NODE_ENV === "development") {
     console.error(`[teamDirectory] Invalid teamId encountered: ${id}`);
  }
  return 0; 
}
