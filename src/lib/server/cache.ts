import "server-only";
// =============================================================================
// Apex PL — Upstash Redis Cache Adapter (Server-Only)
// =============================================================================

import { Redis } from "@upstash/redis";

// Cache version prefix for invalidation
const CACHE_VERSION = "v1";

// Initialize Redis client lazily to avoid errors when not configured
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!isCacheConfigured()) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  // FPL upstream data
  BOOTSTRAP_STATIC: 45 * 60, // 45 minutes
  BOOTSTRAP_STATIC_MATCHDAY: 30 * 60, // 30 minutes
  FIXTURES: 45 * 60, // 45 minutes
  FIXTURES_MATCHDAY: 3 * 60, // 3 minutes
  ELEMENT_SUMMARY: 30 * 60, // 30 minutes
  // Derived/normalized data
  TEAMS: 20 * 60, // 20 minutes
  PLAYERS: 30 * 60, // 30 minutes
  COMPARE: 20 * 60, // 20 minutes
} as const;

// Versioned cache keys
export const CACHE_KEYS = {
  // FPL upstream
  BOOTSTRAP: `apexpl:${CACHE_VERSION}:fpl:bootstrap`,
  FIXTURES: (event?: number) =>
    event ? `apexpl:${CACHE_VERSION}:fpl:fixtures:gw${event}` : `apexpl:${CACHE_VERSION}:fpl:fixtures:all`,
  ELEMENT_SUMMARY: (playerId: number) => `apexpl:${CACHE_VERSION}:fpl:element:${playerId}`,
  // Derived data
  TEAMS_NORMALIZED: `apexpl:${CACHE_VERSION}:teams`,
  // Players with query params
  PLAYERS: (params?: { sort?: string; position?: string; team?: number; minMins?: number }) => {
    const sort = params?.sort ?? "reality";
    const pos = params?.position ?? "all";
    const team = params?.team ?? "all";
    const min = params?.minMins ?? 0;
    return `apexpl:${CACHE_VERSION}:players:sort=${sort}:pos=${pos}:team=${team}:min=${min}`;
  },
  // Raw normalized players (pre-filter, used as base)
  PLAYERS_BASE: `apexpl:${CACHE_VERSION}:players:base`,
  COMPARE: (a: number, b: number) => `apexpl:${CACHE_VERSION}:compare:${Math.min(a, b)}-${Math.max(a, b)}`,
} as const;

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  timestamp: number;
}

/**
 * Check if Upstash is configured
 */
export function isCacheConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Fallback in-memory cache for local dev without Upstash
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Get cached value with stale detection
 */
export async function cacheGet<T>(key: string, ttlSeconds: number): Promise<CacheResult<T> | null> {
  const client = getRedis();
  
  if (client) {
    try {
      const cached = await client.get<{ data: T; timestamp: number }>(key);
      if (!cached) return null;

      const isStale = Date.now() - cached.timestamp > ttlSeconds * 1000;
      return {
        data: cached.data,
        isStale,
        timestamp: cached.timestamp,
      };
    } catch (error) {
      console.error(`[Cache] GET error for ${key}:`, error);
      // Fall through to memory cache
    }
  }

  // Memory fallback
  const cached = memoryCache.get(key) as { data: T; timestamp: number } | undefined;
  if (!cached) return null;

  const isStale = Date.now() - cached.timestamp > ttlSeconds * 1000;
  return { data: cached.data, isStale, timestamp: cached.timestamp };
}

/**
 * Set cached value with timestamp
 */
export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const payload = { data, timestamp: Date.now() };
  const client = getRedis();

  if (client) {
    try {
      // Store for 2x TTL to allow stale reads
      await client.set(key, payload, { ex: ttlSeconds * 2 });
      return;
    } catch (error) {
      console.error(`[Cache] SET error for ${key}:`, error);
      // Fall through to memory cache
    }
  }

  // Memory fallback
  memoryCache.set(key, payload);

  // Auto-cleanup after 2x TTL (avoid memory leak)
  setTimeout(() => memoryCache.delete(key), ttlSeconds * 2 * 1000);
}

/**
 * Trigger background refresh (fire-and-forget)
 * For SWR: return stale immediately, refresh in background
 */
export function triggerBackgroundRefresh(
  key: string,
  fetcher: () => Promise<unknown>,
  ttlSeconds: number
): void {
  // Fire and forget - don't await
  fetcher()
    .then((data) => {
      cacheSet(key, data, ttlSeconds);
      console.log(`[Cache] Background refresh completed for ${key}`);
    })
    .catch((error) => {
      console.error(`[Cache] Background refresh failed for ${key}:`, error);
    });
}

/**
 * Get with SWR behavior:
 * - If fresh cache exists: return it
 * - If stale cache exists: return it immediately + trigger background refresh
 * - If no cache: return null (caller must fetch)
 */
export async function cacheGetWithSWR<T>(
  key: string,
  ttlSeconds: number,
  backgroundFetcher?: () => Promise<T>
): Promise<CacheResult<T> | null> {
  const result = await cacheGet<T>(key, ttlSeconds);

  if (result && result.isStale && backgroundFetcher) {
    // Trigger background refresh (non-blocking)
    triggerBackgroundRefresh(key, backgroundFetcher, ttlSeconds);
  }

  return result;
}

// Aliases for backward compatibility
export const cacheGetWithFallback = cacheGet;
export const cacheSetWithFallback = cacheSet;
