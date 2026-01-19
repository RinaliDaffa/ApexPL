import "server-only";
// =============================================================================
// Apex PL — Wikidata API Client (No API Keys Required)
// =============================================================================

import type { WikidataCandidate, PlayerProfile, SquadMember } from "./playerProfile";
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from "./cache";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIDATA_ENTITY = "https://www.wikidata.org/wiki/Special:EntityData";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const WIKIMEDIA_FILE_PATH = "https://commons.wikimedia.org/wiki/Special:FilePath";

// Wikidata property IDs
const PROPS = {
  INSTANCE_OF: "P31",
  OCCUPATION: "P106",
  DATE_OF_BIRTH: "P569",
  COUNTRY_OF_CITIZENSHIP: "P27",
  HEIGHT: "P2048",
  POSITION: "P413",
  PREFERRED_FOOT: "P4239",
  IMAGE: "P18",
  MEMBER_OF_SPORTS_TEAM: "P54",
} as const;

// QIDS removed as they are hardcoded in SPARQL string

/**
 * Normalize name for comparison (lowercase, remove diacritics, trim)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// SPARQL Team Squad Fetcher
// =============================================================================

/**
 * Build SPARQL query for team squad members
 * Fetches current players (no end date on team membership)
 */
function buildSquadSparqlQuery(teamQid: string, currentOnly: boolean = true): string {
  const endTimeFilter = currentOnly 
    ? "FILTER(NOT EXISTS { ?st pq:P582 ?endTime . })"
    : "";
  
  return `
SELECT ?player ?playerLabel 
       (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
       (SAMPLE(?dob) AS ?dob)
       (SAMPLE(?natLabel) AS ?nat)
       (SAMPLE(?height) AS ?height)
       (SAMPLE(?footLabel) AS ?foot)
       (SAMPLE(?posLabel) AS ?pos)
       (SAMPLE(?img) AS ?img)
WHERE {
  ?player wdt:P31 wd:Q5 .
  ?player wdt:P106 wd:Q937857 .
  ?player p:P54 ?st .
  ?st ps:P54 wd:${teamQid} .
  ${endTimeFilter}
  
  OPTIONAL { ?player skos:altLabel ?alias . FILTER(LANG(?alias)="en") }
  OPTIONAL { ?player wdt:P569 ?dob . }
  OPTIONAL { ?player wdt:P27 ?nat . ?nat rdfs:label ?natLabel . FILTER(LANG(?natLabel)="en") }
  OPTIONAL { ?player wdt:P2048 ?height . }
  OPTIONAL { ?player wdt:P4239 ?foot . ?foot rdfs:label ?footLabel . FILTER(LANG(?footLabel)="en") }
  OPTIONAL { ?player wdt:P413 ?pos . ?pos rdfs:label ?posLabel . FILTER(LANG(?posLabel)="en") }
  OPTIONAL { ?player wdt:P18 ?img . }
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,en-gb" . }
}
GROUP BY ?player ?playerLabel
LIMIT 400
  `.trim();
}

/**
 * Parse height value to cm (handles meters and cm)
 */
function parseHeightToCm(height: unknown): number | null {
  if (height === null || height === undefined) return null;
  const val = typeof height === "string" ? parseFloat(height) : height as number;
  if (isNaN(val)) return null;
  // If < 3, assume meters; convert to cm
  if (val < 3) return Math.round(val * 100);
  // If already cm-ish (e.g., 180), use as-is
  return Math.round(val);
}

/**
 * Parse foot label to enum
 */
function parseFootLabel(footLabel: string | null): "Left" | "Right" | "Both" | null {
  if (!footLabel) return null;
  const lower = footLabel.toLowerCase();
  if (lower.includes("left")) return "Left";
  if (lower.includes("right")) return "Right";
  if (lower.includes("both") || lower.includes("ambidextrous")) return "Both";
  return null;
}

/**
 * Extract QID from Wikidata entity URL
 */
function extractQidFromUrl(url: string): string {
  const match = url.match(/Q\d+$/);
  return match ? match[0] : url;
}

/**
 * Extract filename from Wikimedia Commons URL or raw filename
 */
function extractImageFilename(img: unknown): string | null {
  if (!img) return null;
  const str = String(img);
  // If it's a full URL, extract filename
  if (str.includes("commons.wikimedia.org")) {
    const match = str.match(/Special:FilePath\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);
  }
  // If it starts with http, try to extract from path
  if (str.startsWith("http")) {
    const parts = str.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  }
  // Already a filename
  return str;
}

/**
 * Parse SPARQL results to SquadMember array
 */
function parseSparqlResults(results: unknown[]): SquadMember[] {
  return results.map((row: unknown) => {
    const r = row as Record<string, { value?: string }>;
    
    const playerUrl = r.player?.value || "";
    const qid = extractQidFromUrl(playerUrl);
    const label = r.playerLabel?.value || "";
    const aliasesRaw = r.aliases?.value || "";
    const aliases = aliasesRaw 
      ? [...new Set(aliasesRaw.split("|").filter(a => a.trim()))]
      : [];
    
    // Parse DOB to ISO date
    let dob: string | null = null;
    if (r.dob?.value) {
      const match = r.dob.value.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        dob = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    
    return {
      qid,
      label,
      aliases,
      dob,
      nationality: r.nat?.value || null,
      heightCm: parseHeightToCm(r.height?.value),
      foot: parseFootLabel(r.foot?.value || null),
      position: r.pos?.value || null,
      image: extractImageFilename(r.img?.value),
    };
  }).filter(m => m.qid && m.label); // Filter out empty results
}

/**
 * Fetch team squad from Wikidata via SPARQL
 * Uses two-stage approach: current players first, then all if too few
 */
export async function getTeamSquadFromWikidata(
  teamQid: string,
  teamId: number
): Promise<SquadMember[]> {
  // Check cache first
  const cacheKey = CACHE_KEYS.TEAM_SQUAD(teamId);
  const cached = await cacheGet<SquadMember[]>(cacheKey, CACHE_TTL.TEAM_SQUAD);
  if (cached && !cached.isStale) {
    console.log(`[Wikidata] Squad cache hit for team ${teamId} (${cached.data.length} players)`);
    return cached.data;
  }

  console.log(`[Wikidata] Fetching squad from SPARQL for team ${teamId} (${teamQid})`);
  
  try {
    // Stage 1: Current players only
    let query = buildSquadSparqlQuery(teamQid, true);
    let squad = await executeSparqlQuery(query);
    
    // If too few results, try without current-only filter
    if (squad.length < 10) {
      console.log(`[Wikidata] Only ${squad.length} current players, fetching all...`);
      query = buildSquadSparqlQuery(teamQid, false);
      squad = await executeSparqlQuery(query);
    }
    
    // If too many, we keep as-is (SPARQL already limits to 400)
    if (squad.length > 250) {
      console.log(`[Wikidata] Large squad (${squad.length}), using as-is with LIMIT`);
    }
    
    console.log(`[Wikidata] Fetched ${squad.length} squad members for team ${teamId}`);
    
    // Cache results
    await cacheSet(cacheKey, squad, CACHE_TTL.TEAM_SQUAD);
    
    return squad;
  } catch (error) {
    console.error(`[Wikidata] SPARQL error for team ${teamId}:`, error);
    // Return cached stale data if available
    if (cached) {
      console.log(`[Wikidata] Using stale cache for team ${teamId}`);
      return cached.data;
    }
    return [];
  }
}

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparqlQuery(query: string): Promise<SquadMember[]> {
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ApexPL/1.0 (https://apexpl.vercel.app; contact@apexpl.app)",
      "Accept": "application/sparql-results+json",
    },
    next: { revalidate: 86400 }, // 1 day HTTP cache
  });
  
  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const bindings = data.results?.bindings || [];
  
  return parseSparqlResults(bindings);
}

/**
 * Search for person candidates on Wikidata
 */
export async function searchPersonCandidates(name: string): Promise<WikidataCandidate[]> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "en",
    uselang: "en",
    type: "item",
    limit: "10",
    format: "json",
    origin: "*",
  });

  try {
    const response = await fetch(`${WIKIDATA_API}?${params}`, {
      headers: {
        "User-Agent": "ApexPL/1.0 (https://apexpl.vercel.app; contact@apexpl.app)",
      },
      next: { revalidate: 86400 }, // 1 day
    });

    if (!response.ok) {
      console.error(`[Wikidata] Search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    return (data.search || []).map((item: Record<string, unknown>) => ({
      qid: item.id as string,
      label: item.label as string || "",
      description: item.description as string || "",
      aliases: item.aliases as string[] || [],
    }));
  } catch (error) {
    console.error("[Wikidata] Search error:", error);
    return [];
  }
}

/**
 * Fetch entity data from Wikidata
 */
export async function fetchEntity(qid: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${WIKIDATA_ENTITY}/${qid}.json`, {
      headers: {
        "User-Agent": "ApexPL/1.0 (https://apexpl.vercel.app; contact@apexpl.app)",
      },
      next: { revalidate: 86400 * 7 }, // 7 days
    });

    if (!response.ok) {
      console.error(`[Wikidata] Entity fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.entities?.[qid] || null;
  } catch (error) {
    console.error("[Wikidata] Entity fetch error:", error);
    return null;
  }
}

/**
 * Extract string value from Wikidata claim
 */
function getClaimStringValue(entity: Record<string, unknown>, property: string): string | null {
  const claims = entity.claims as Record<string, unknown[]> | undefined;
  const propClaims = claims?.[property];
  if (!propClaims || propClaims.length === 0) return null;

  const mainsnak = (propClaims[0] as Record<string, unknown>)?.mainsnak as Record<string, unknown> | undefined;
  const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
  
  if (datavalue?.type === "string") {
    return datavalue.value as string;
  }
  
  // For entity references, get the ID
  if (datavalue?.type === "wikibase-entityid") {
    const value = datavalue.value as Record<string, unknown>;
    return value?.id as string || null;
  }
  
  return null;
}

/**
 * Extract quantity value from Wikidata claim
 */
function getClaimQuantityValue(entity: Record<string, unknown>, property: string): number | null {
  const claims = entity.claims as Record<string, unknown[]> | undefined;
  const propClaims = claims?.[property];
  if (!propClaims || propClaims.length === 0) return null;

  const mainsnak = (propClaims[0] as Record<string, unknown>)?.mainsnak as Record<string, unknown> | undefined;
  const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
  
  if (datavalue?.type === "quantity") {
    const value = datavalue.value as Record<string, unknown>;
    const amount = value?.amount as string;
    if (amount) {
      return parseFloat(amount.replace("+", ""));
    }
  }
  
  return null;
}

/**
 * Extract time value from Wikidata claim
 */
function getClaimTimeValue(entity: Record<string, unknown>, property: string): string | null {
  const claims = entity.claims as Record<string, unknown[]> | undefined;
  const propClaims = claims?.[property];
  if (!propClaims || propClaims.length === 0) return null;

  const mainsnak = (propClaims[0] as Record<string, unknown>)?.mainsnak as Record<string, unknown> | undefined;
  const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
  
  if (datavalue?.type === "time") {
    const value = datavalue.value as Record<string, unknown>;
    const time = value?.time as string;
    if (time) {
      // Wikidata format: +YYYY-MM-DDT00:00:00Z
      const match = time.match(/([+-]?\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
  }
  
  return null;
}

/**
 * Check if entity has a specific occupation
 */
export function hasOccupation(entity: Record<string, unknown>, occupationQid: string): boolean {
  const claims = entity.claims as Record<string, unknown[]> | undefined;
  const occupations = claims?.[PROPS.OCCUPATION] || [];
  
  return occupations.some((claim: unknown) => {
    const mainsnak = (claim as Record<string, unknown>)?.mainsnak as Record<string, unknown> | undefined;
    const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
    if (datavalue?.type === "wikibase-entityid") {
      const value = datavalue.value as Record<string, unknown>;
      return value?.id === occupationQid;
    }
    return false;
  });
}

/**
 * Get label for an entity QID
 */
async function getEntityLabel(qid: string): Promise<string | null> {
  const entity = await fetchEntity(qid);
  if (!entity) return null;
  
  const labels = entity.labels as Record<string, { value: string }> | undefined;
  return labels?.en?.value || labels?.["en-gb"]?.value || null;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string): number | null {
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 && age < 100 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Get Wikimedia Commons image URL from filename
 */
export function getWikimediaImageUrl(filename: string, width: number = 400): string {
  // Encode the filename properly
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return `${WIKIMEDIA_FILE_PATH}/${encoded}?width=${width}`;
}

/**
 * Parse Wikidata entity into PlayerProfile
 */
export async function parseEntityToProfile(qid: string, entity: Record<string, unknown>): Promise<PlayerProfile | null> {
  try {
    // Get basic labels
    const labels = entity.labels as Record<string, { value: string }> | undefined;
    const fullName = labels?.en?.value || labels?.["en-gb"]?.value || null;
    
    if (!fullName) return null;

    // Extract claims
    const dob = getClaimTimeValue(entity, PROPS.DATE_OF_BIRTH);
    const age = dob ? calculateAge(dob) : null;
    
    // Height (convert to cm if in meters)
    let heightCm = getClaimQuantityValue(entity, PROPS.HEIGHT);
    if (heightCm !== null && heightCm < 10) {
      // Probably in meters, convert to cm
      heightCm = Math.round(heightCm * 100);
    }
    
    // Image
    const imageFile = getClaimStringValue(entity, PROPS.IMAGE);
    const photoUrl = imageFile ? getWikimediaImageUrl(imageFile) : null;
    
    // Nationality (get label for the QID)
    const nationalityQid = getClaimStringValue(entity, PROPS.COUNTRY_OF_CITIZENSHIP);
    let nationality: string | null = null;
    if (nationalityQid) {
      nationality = await getEntityLabel(nationalityQid);
    }
    
    // Position (get label for the QID)
    const positionQid = getClaimStringValue(entity, PROPS.POSITION);
    let primaryPosition: string | null = null;
    if (positionQid) {
      primaryPosition = await getEntityLabel(positionQid);
    }
    
    // Preferred foot (get label for the QID)
    const footQid = getClaimStringValue(entity, PROPS.PREFERRED_FOOT);
    let preferredFoot: "Left" | "Right" | "Both" | null = null;
    if (footQid) {
      const footLabel = await getEntityLabel(footQid);
      if (footLabel?.toLowerCase().includes("left")) preferredFoot = "Left";
      else if (footLabel?.toLowerCase().includes("right")) preferredFoot = "Right";
      else if (footLabel?.toLowerCase().includes("both")) preferredFoot = "Both";
    }
    
    // Current club (get label for most recent team)
    const claims = entity.claims as Record<string, unknown[]> | undefined;
    const teamClaims = claims?.[PROPS.MEMBER_OF_SPORTS_TEAM] || [];
    let currentClub: string | null = null;
    if (teamClaims.length > 0) {
      // Get the most recent (last) team entry without end date
      for (let i = teamClaims.length - 1; i >= 0; i--) {
        const claim = teamClaims[i] as Record<string, unknown>;
        const qualifiers = claim.qualifiers as Record<string, unknown[]> | undefined;
        const endTime = qualifiers?.P582; // P582 = end time
        if (!endTime) {
          const mainsnak = claim.mainsnak as Record<string, unknown> | undefined;
          const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
          if (datavalue?.type === "wikibase-entityid") {
            const value = datavalue.value as Record<string, unknown>;
            const clubQid = value?.id as string;
            if (clubQid) {
              currentClub = await getEntityLabel(clubQid);
              break;
            }
          }
        }
      }
    }

    return {
      wikidataQid: qid,
      fullName,
      photoUrl,
      nationality,
      dateOfBirth: dob,
      age,
      heightCm,
      preferredFoot,
      primaryPosition,
      currentClub,
    };
  } catch (error) {
    console.error("[Wikidata] Profile parse error:", error);
    return null;
  }
}
