import "server-only";
// =============================================================================
// Apex PL — FPL Fetch Client (Server-Only)
// =============================================================================

import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS, triggerBackgroundRefresh } from "./cache";
import { dedupeRequest } from "./dedupe";
import {
  FplBootstrapStaticSchema,
  FplFixturesSchema,
  FplElementSummarySchema,
  type FplBootstrapStaticValidated,
  type FplFixtureValidated,
  type FplElementSummaryValidated,
} from "./schemas";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

// Re-export validated types
export type FplBootstrapStatic = FplBootstrapStaticValidated;
export type FplFixture = FplFixtureValidated;
export type FplElementSummary = FplElementSummaryValidated;
export type FplElement = FplBootstrapStaticValidated["elements"][0];
export type FplTeam = FplBootstrapStaticValidated["teams"][0];
export type FplEvent = FplBootstrapStaticValidated["events"][0];

// -----------------------------------------------------------------------------
// Fetch with Retry + Validation
// -----------------------------------------------------------------------------

// Helper to timeout a promise
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (error) {
    clearTimeout(timer!);
    throw error;
  }
}

async function fetchWithRetry<T>(
  url: string,
  schema: { parse: (data: unknown) => T },
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 5 second timeout for upstream requests
      const response = await withTimeout(
        fetch(url, {
          headers: { "User-Agent": "ApexPL/1.0" },
          cache: "no-store", // Disable fetch cache, we use our own
        }),
        5000 
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      
      // Validate with Zod
      return schema.parse(json);
    } catch (error) {
      lastError = error as Error;
      console.error(`[FPL] Attempt ${attempt + 1} failed for ${url}:`, lastError.message);
      
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Fetch failed");
}

// -----------------------------------------------------------------------------
// Proxy Result Type
// -----------------------------------------------------------------------------

export interface ProxyResult<T> {
  data: T;
  lastUpdated: string;
  sourceStatus: "fresh" | "stale";
}

// -----------------------------------------------------------------------------
// FPL Fetch Functions (with caching + SWR + dedupe + validation)
// -----------------------------------------------------------------------------

export async function fetchBootstrap(isMatchday = false): Promise<ProxyResult<FplBootstrapStatic>> {
  const cacheKey = CACHE_KEYS.BOOTSTRAP;
  const ttl = isMatchday ? CACHE_TTL.BOOTSTRAP_STATIC_MATCHDAY : CACHE_TTL.BOOTSTRAP_STATIC;

  // Check cache first
  const cached = await cacheGet<FplBootstrapStatic>(cacheKey, ttl);

  // Fresh cache - return immediately
  if (cached && !cached.isStale) {
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "fresh",
    };
  }

  // Stale cache - return immediately but trigger background refresh
  if (cached && cached.isStale) {
    const fetcher = async () => {
      const data = await fetchWithRetry(
        `${FPL_BASE_URL}/bootstrap-static/`,
        FplBootstrapStaticSchema
      );
      return data;
    };
    
    triggerBackgroundRefresh(cacheKey, fetcher, ttl);
    
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "stale",
    };
  }

  // No cache - must fetch
  try {
    const data = await dedupeRequest(cacheKey, () =>
      fetchWithRetry(`${FPL_BASE_URL}/bootstrap-static/`, FplBootstrapStaticSchema)
    );

    await cacheSet(cacheKey, data, ttl);

    return {
      data,
      lastUpdated: new Date().toISOString(),
      sourceStatus: "fresh",
    };
  } catch (error) {
    // Last resort: return stale if somehow available
    if (cached) {
      return {
        data: cached.data,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        sourceStatus: "stale",
      };
    }
    throw error;
  }
}

export async function fetchFixtures(event?: number, isMatchday = false): Promise<ProxyResult<FplFixture[]>> {
  const cacheKey = CACHE_KEYS.FIXTURES(event);
  const ttl = isMatchday ? CACHE_TTL.FIXTURES_MATCHDAY : CACHE_TTL.FIXTURES;

  const cached = await cacheGet<FplFixture[]>(cacheKey, ttl);

  if (cached && !cached.isStale) {
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "fresh",
    };
  }

  if (cached && cached.isStale) {
    const url = event ? `${FPL_BASE_URL}/fixtures/?event=${event}` : `${FPL_BASE_URL}/fixtures/`;
    triggerBackgroundRefresh(
      cacheKey,
      () => fetchWithRetry(url, FplFixturesSchema),
      ttl
    );
    
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "stale",
    };
  }

  try {
    const url = event ? `${FPL_BASE_URL}/fixtures/?event=${event}` : `${FPL_BASE_URL}/fixtures/`;
    const data = await dedupeRequest(cacheKey, () => fetchWithRetry(url, FplFixturesSchema));

    await cacheSet(cacheKey, data, ttl);

    return {
      data,
      lastUpdated: new Date().toISOString(),
      sourceStatus: "fresh",
    };
  } catch (error) {
    if (cached) {
      return {
        data: cached.data,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        sourceStatus: "stale",
      };
    }
    throw error;
  }
}

/**
 * Fetch element summary (player history) - ONLY for compare/detail endpoints
 * Never call this for list views!
 */
export async function fetchElementSummary(playerId: number): Promise<ProxyResult<FplElementSummary>> {
  const cacheKey = CACHE_KEYS.ELEMENT_SUMMARY(playerId);
  const ttl = CACHE_TTL.ELEMENT_SUMMARY;

  const cached = await cacheGet<FplElementSummary>(cacheKey, ttl);

  if (cached && !cached.isStale) {
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "fresh",
    };
  }

  if (cached && cached.isStale) {
    triggerBackgroundRefresh(
      cacheKey,
      () => fetchWithRetry(`${FPL_BASE_URL}/element-summary/${playerId}/`, FplElementSummarySchema),
      ttl
    );
    
    return {
      data: cached.data,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      sourceStatus: "stale",
    };
  }

  try {
    const data = await dedupeRequest(cacheKey, () =>
      fetchWithRetry(`${FPL_BASE_URL}/element-summary/${playerId}/`, FplElementSummarySchema)
    );

    await cacheSet(cacheKey, data, ttl);

    return {
      data,
      lastUpdated: new Date().toISOString(),
      sourceStatus: "fresh",
    };
  } catch (error) {
    if (cached) {
      return {
        data: cached.data,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        sourceStatus: "stale",
      };
    }
    throw error;
  }
}

/**
 * Get current gameweek info
 */
export function getCurrentGameweek(bootstrap: FplBootstrapStatic): FplEvent | undefined {
  return bootstrap.events.find((e) => e.is_current) ?? bootstrap.events.find((e) => e.is_next);
}

/**
 * Check if we're on matchday (for shorter TTLs)
 */
export function isMatchday(bootstrap: FplBootstrapStatic): boolean {
  const current = getCurrentGameweek(bootstrap);
  if (!current) return false;
  
  const deadline = new Date(current.deadline_time);
  const now = new Date();
  
  // Consider matchday as 2 hours before deadline until event finishes
  const matchdayStart = new Date(deadline.getTime() - 2 * 60 * 60 * 1000);
  return now >= matchdayStart && !current.finished;
}
