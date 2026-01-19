import "server-only";
// =============================================================================
// Apex PL — Player Profile Resolver v1.1 (Team-Scoped Wikidata Resolution)
// =============================================================================
//
// Two-stage strategy:
// 1. Get team squad from Wikidata SPARQL (cached 14 days)
// 2. Match FPL player locally against squad (no network per player)
// 3. Fallback to wbsearchentities if squad match fails
//

import type { 
  FplPlayerInput, 
  PlayerProfile, 
  SquadMember, 
  ScoredSquadMember,
  ScoredCandidate 
} from "./playerProfile";
import { 
  getTeamSquadFromWikidata,
  searchPersonCandidates, 
  fetchEntity, 
  parseEntityToProfile, 
  hasOccupation,
  getWikimediaImageUrl,
  calculateAge,
} from "./wikidata";
import { getTeamQid } from "./teamQids";
import { getManualOverride } from "./playerOverrides";
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from "./cache";

// =============================================================================
// Configuration
// =============================================================================

// Confidence thresholds for squad matching (lenient due to team-scoping)
const SQUAD_MIN_CONFIDENCE = 0.45;  // Lower threshold since we have team context
const SQUAD_MIN_MARGIN = 0.08;      // Lower margin required

// Confidence thresholds for fallback search (still need to be careful)
const FALLBACK_MIN_CONFIDENCE = 0.65;
const FALLBACK_MIN_MARGIN = 0.10;

// Position mappings for compatibility scoring
const POSITION_KEYWORDS: Record<string, string[]> = {
  GKP: ["goalkeeper", "goalie", "keeper"],
  DEF: ["defender", "centre-back", "center-back", "fullback", "full-back", "wing-back"],
  MID: ["midfielder", "midfield", "winger"],
  FWD: ["forward", "striker", "attacker", "winger"],
};

// =============================================================================
// Name Normalization & Matching
// =============================================================================

/**
 * Enhanced name normalization preserving name particles
 */
function normalizeNameAdvanced(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[''`]/g, "'")          // Normalize apostrophes
    .replace(/[-–—]/g, " ")          // Normalize hyphens to spaces
    .replace(/[.,]/g, "")            // Remove periods and commas
    .replace(/\s+/g, " ")            // Collapse spaces
    .trim();
}

/**
 * Generate all possible match keys for an FPL player
 */
function generateMatchKeys(fpl: FplPlayerInput): string[] {
  const keys: string[] = [];
  
  // Full name
  if (fpl.firstName && fpl.secondName) {
    keys.push(normalizeNameAdvanced(`${fpl.firstName} ${fpl.secondName}`));
  }
  
  // Last name only
  if (fpl.secondName) {
    keys.push(normalizeNameAdvanced(fpl.secondName));
  }
  
  // Web name
  keys.push(normalizeNameAdvanced(fpl.webName));
  
  // Handle hyphenated names (e.g., "Lewis-Potter" → ["lewis potter", "potter"])
  if (fpl.secondName?.includes("-")) {
    const parts = fpl.secondName.split("-");
    keys.push(normalizeNameAdvanced(parts.join(" ")));
    keys.push(normalizeNameAdvanced(parts[parts.length - 1]));
  }
  
  // Handle common name particles
  if (fpl.secondName) {
    const particles = ["van", "de", "di", "da", "dos", "el", "al"];
    const words = fpl.secondName.toLowerCase().split(/\s+/);
    if (words.length > 1 && particles.includes(words[0])) {
      // Add just the main part without particle
      keys.push(normalizeNameAdvanced(words.slice(1).join(" ")));
    }
  }
  
  return [...new Set(keys)]; // Deduplicate
}

/**
 * Check if FPL position is compatible with Wikidata position label
 */
function isPositionCompatible(fplPosition: string, wikidataPosition: string | null): boolean {
  if (!wikidataPosition) return false;
  const posLower = wikidataPosition.toLowerCase();
  const keywords = POSITION_KEYWORDS[fplPosition] || [];
  return keywords.some(kw => posLower.includes(kw));
}

// =============================================================================
// Squad-Based Scoring (Local, No Network)
// =============================================================================

/**
 * Score a squad member against FPL player data (pure local, no network)
 */
function scoreSquadMember(
  member: SquadMember,
  fpl: FplPlayerInput,
  matchKeys: string[]
): ScoredSquadMember {
  let score = 0;
  const matchDetails: string[] = [];
  
  const memberLabelNorm = normalizeNameAdvanced(member.label);
  const memberAliasesNorm = member.aliases.map(a => normalizeNameAdvanced(a));
  
  // Full name keys include "first last"
  const fullNameKey = matchKeys[0]; // First key is always full name if available
  
  // 1. Exact fullName match (+0.55)
  if (memberLabelNorm === fullNameKey) {
    score += 0.55;
    matchDetails.push("exact_full");
  } else {
    // 2. Alias exact match (+0.50)
    const aliasMatch = memberAliasesNorm.find(a => matchKeys.includes(a));
    if (aliasMatch) {
      score += 0.50;
      matchDetails.push("alias_exact");
    } else {
      // 3. Last-name match at end of label (+0.25)
      const lastNameKey = matchKeys.find(k => k.length > 2 && memberLabelNorm.endsWith(k));
      if (lastNameKey) {
        score += 0.25;
        matchDetails.push("last_name");
      }
      
      // 4. WebName contained in label or alias (+0.20)
      const webNameKey = normalizeNameAdvanced(fpl.webName);
      const webNameInLabel = memberLabelNorm.includes(webNameKey) || 
                             memberAliasesNorm.some(a => a.includes(webNameKey));
      if (webNameInLabel && webNameKey.length > 2) {
        score += 0.20;
        matchDetails.push("webname_partial");
      }
    }
  }
  
  // 5. Position compatibility boost (+0.10)
  if (isPositionCompatible(fpl.position, member.position)) {
    score += 0.10;
    matchDetails.push("position");
  }
  
  return {
    ...member,
    score: Math.max(0, Math.min(1, score)),
    matchDetails,
  };
}

// =============================================================================
// Profile Building
// =============================================================================

/**
 * Build PlayerProfile from SquadMember (no additional network calls)
 */
function buildProfileFromSquadMember(member: SquadMember, teamName: string): PlayerProfile {
  return {
    wikidataQid: member.qid,
    fullName: member.label,
    photoUrl: member.image ? getWikimediaImageUrl(member.image, 512) : null,
    nationality: member.nationality,
    dateOfBirth: member.dob,
    age: member.dob ? calculateAge(member.dob) : null,
    heightCm: member.heightCm,
    preferredFoot: member.foot,
    primaryPosition: member.position,
    currentClub: teamName,
  };
}

/**
 * Fetch entity and parse to profile (with caching) - for manual overrides
 */
async function fetchAndParseProfile(qid: string): Promise<PlayerProfile | null> {
  const cacheKey = CACHE_KEYS.PLAYER_PROFILE(qid);
  
  // Check profile cache
  const cached = await cacheGet<PlayerProfile>(cacheKey, CACHE_TTL.PLAYER_PROFILE);
  if (cached && !cached.isStale) {
    return cached.data;
  }

  // Fetch and parse
  const entity = await fetchEntity(qid);
  if (!entity) return null;

  const profile = await parseEntityToProfile(qid, entity);
  if (profile) {
    await cacheSet(cacheKey, profile, CACHE_TTL.PLAYER_PROFILE);
  }

  return profile;
}

// =============================================================================
// Main Resolver
// =============================================================================

/**
 * Resolve FPL player to Wikidata profile using two-stage team-scoped strategy
 */
export async function resolvePlayerProfile(fpl: FplPlayerInput): Promise<PlayerProfile | null> {
  const mappingCacheKey = CACHE_KEYS.PLAYER_MAPPING(fpl.id);
  
  try {
    // 1. Check manual override first
    const override = getManualOverride(fpl.id);
    if (override) {
      console.log(`[Resolver] Using manual override for ${fpl.webName}: ${override}`);
      return await fetchAndParseProfile(override);
    }

    // 2. Check cache for existing QID mapping
    const cachedQid = await cacheGet<string>(mappingCacheKey, CACHE_TTL.PLAYER_MAPPING);
    if (cachedQid && !cachedQid.isStale) {
      console.log(`[Resolver] QID cache hit for ${fpl.webName}: ${cachedQid.data}`);
      
      // Check profile cache
      const profileCacheKey = CACHE_KEYS.PLAYER_PROFILE(cachedQid.data);
      const cachedProfile = await cacheGet<PlayerProfile>(profileCacheKey, CACHE_TTL.PLAYER_PROFILE);
      if (cachedProfile && !cachedProfile.isStale) {
        return cachedProfile.data;
      }
      
      // Profile cache miss - fetch entity
      return await fetchAndParseProfile(cachedQid.data);
    }

    // 3. STAGE 1: Team-scoped squad matching
    const teamQid = getTeamQid(fpl.teamId);
    if (teamQid) {
      const profile = await resolveFromSquad(fpl, teamQid, mappingCacheKey);
      if (profile) return profile;
    } else {
      console.log(`[Resolver] No team QID for teamId ${fpl.teamId}, skipping squad match`);
    }

    // 4. STAGE 2: Fallback search
    console.log(`[Resolver] Squad match failed for ${fpl.webName}, trying fallback search...`);
    return await resolveFallbackSearch(fpl, teamQid, mappingCacheKey);

  } catch (error) {
    console.error(`[Resolver] Error resolving ${fpl.webName}:`, error);
    return null;
  }
}

/**
 * Stage 1: Resolve from team squad (local matching, no per-player network)
 */
async function resolveFromSquad(
  fpl: FplPlayerInput,
  teamQid: string,
  mappingCacheKey: string
): Promise<PlayerProfile | null> {
  // Get squad (cached)
  const squad = await getTeamSquadFromWikidata(teamQid, fpl.teamId);
  if (squad.length === 0) {
    console.log(`[Resolver] Empty squad for team ${fpl.teamId}`);
    return null;
  }

  // Generate match keys
  const matchKeys = generateMatchKeys(fpl);
  console.log(`[Resolver] Matching ${fpl.webName} with keys: [${matchKeys.join(", ")}]`);

  // Score all squad members
  const scored: ScoredSquadMember[] = squad.map(m => scoreSquadMember(m, fpl, matchKeys));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];
  const margin = secondBest ? best.score - secondBest.score : best.score;

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Resolver] Top squad matches for ${fpl.webName}:`);
    scored.slice(0, 3).forEach(m => {
      console.log(`  ${m.qid}: ${m.label} (${m.score.toFixed(2)}) [${m.matchDetails.join(", ")}]`);
    });
  }

  // Check thresholds
  if (best.score < SQUAD_MIN_CONFIDENCE) {
    console.log(`[Resolver] Best score ${best.score.toFixed(2)} below threshold ${SQUAD_MIN_CONFIDENCE}`);
    return null;
  }
  
  if (margin < SQUAD_MIN_MARGIN && secondBest) {
    console.log(`[Resolver] Margin ${margin.toFixed(2)} below threshold ${SQUAD_MIN_MARGIN} - ambiguous`);
    return null;
  }

  // Match found!
  console.log(`[Resolver] Squad matched ${fpl.webName} → ${best.qid} (${best.label}) score=${best.score.toFixed(2)}`);
  
  // Cache the mapping
  await cacheSet(mappingCacheKey, best.qid, CACHE_TTL.PLAYER_MAPPING);
  
  // Build profile from squad member data (no additional network calls)
  const profile = buildProfileFromSquadMember(best, fpl.teamName);
  
  // Cache the profile
  await cacheSet(CACHE_KEYS.PLAYER_PROFILE(best.qid), profile, CACHE_TTL.PLAYER_PROFILE);
  
  return profile;
}

/**
 * Stage 2: Fallback search using wbsearchentities with club validation
 */
async function resolveFallbackSearch(
  fpl: FplPlayerInput,
  teamQid: string | null,
  mappingCacheKey: string
): Promise<PlayerProfile | null> {
  // Build search query
  const searchQuery = fpl.firstName && fpl.secondName
    ? `${fpl.firstName} ${fpl.secondName} ${fpl.teamName} footballer`
    : `${fpl.webName} ${fpl.teamName} footballer`;

  console.log(`[Resolver] Fallback searching: ${searchQuery}`);
  const candidates = await searchPersonCandidates(searchQuery);
  
  if (candidates.length === 0) {
    console.log(`[Resolver] No fallback candidates for ${fpl.webName}`);
    return null;
  }

  // Validate and score candidates
  const validatedCandidates: ScoredCandidate[] = [];
  
  for (const candidate of candidates.slice(0, 5)) {
    const entity = await fetchEntity(candidate.qid);
    if (!entity) continue;
    
    // Must be a footballer
    if (!hasOccupation(entity, "Q937857")) continue;
    
    // Validate club membership if we have teamQid
    if (teamQid) {
      const claims = entity.claims as Record<string, unknown[]> | undefined;
      const teamClaims = claims?.["P54"] || [];
      const hasClubMembership = teamClaims.some((claim: unknown) => {
        const mainsnak = (claim as Record<string, unknown>)?.mainsnak as Record<string, unknown> | undefined;
        const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
        if (datavalue?.type === "wikibase-entityid") {
          const value = datavalue.value as Record<string, unknown>;
          return value?.id === teamQid;
        }
        return false;
      });
      
      if (!hasClubMembership) continue;
    }
    
    // Score the candidate
    let score = 0;
    const matchDetails: string[] = [];
    
    const candidateNorm = normalizeNameAdvanced(candidate.label);
    const fplFullNorm = normalizeNameAdvanced(
      fpl.firstName && fpl.secondName 
        ? `${fpl.firstName} ${fpl.secondName}` 
        : fpl.webName
    );
    
    if (candidateNorm === fplFullNorm) {
      score += 0.55;
      matchDetails.push("exact_name");
    } else if (candidateNorm.includes(normalizeNameAdvanced(fpl.webName))) {
      score += 0.35;
      matchDetails.push("webname_match");
    }
    
    // Footballer + club validation gives baseline confidence
    score += 0.30;
    matchDetails.push("validated");
    
    validatedCandidates.push({
      ...candidate,
      score: Math.min(1, score),
      matchDetails,
    });
  }
  
  if (validatedCandidates.length === 0) {
    console.log(`[Resolver] No validated fallback candidates for ${fpl.webName}`);
    return null;
  }
  
  validatedCandidates.sort((a, b) => b.score - a.score);
  const best = validatedCandidates[0];
  const secondBest = validatedCandidates[1];
  const margin = secondBest ? best.score - secondBest.score : best.score;
  
  console.log(`[Resolver] Fallback best: ${best.qid} (${best.label}) score=${best.score.toFixed(2)}`);
  
  // Check stricter thresholds for fallback
  if (best.score < FALLBACK_MIN_CONFIDENCE) {
    console.log(`[Resolver] Fallback score ${best.score.toFixed(2)} below threshold ${FALLBACK_MIN_CONFIDENCE}`);
    return null;
  }
  
  if (margin < FALLBACK_MIN_MARGIN && secondBest) {
    console.log(`[Resolver] Fallback margin ${margin.toFixed(2)} below threshold ${FALLBACK_MIN_MARGIN}`);
    return null;
  }
  
  // Match found via fallback!
  console.log(`[Resolver] Fallback matched ${fpl.webName} → ${best.qid}`);
  
  // Cache the mapping
  await cacheSet(mappingCacheKey, best.qid, CACHE_TTL.PLAYER_MAPPING);
  
  // Fetch full profile
  return await fetchAndParseProfile(best.qid);
}
