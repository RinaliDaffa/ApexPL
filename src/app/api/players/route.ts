import { NextRequest, NextResponse } from "next/server";
import { fetchBootstrap } from "@/lib/server/fpl-client";
import { normalizePlayers } from "@/lib/server/normalize";
import { PlayersQuerySchema } from "@/lib/server/schemas";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "@/lib/server/cache";
import { dedupeRequest } from "@/lib/server/dedupe";
import type { ApiResponse, PlayerNormalized, SortKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PlayerNormalized[]>>> {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryResult = PlayersQuerySchema.safeParse({
      sort: searchParams.get("sort") || undefined,
      position: searchParams.get("position") || undefined,
      team: searchParams.get("team") || undefined,
      minMins: searchParams.get("minMins") || undefined,
    });

    // Extract validated params
    const params = queryResult.success ? queryResult.data : {};
    const { position, team, minMins, sort } = params;

    // Build query-aware cache key
    const cacheKey = CACHE_KEYS.PLAYERS({ sort, position, team, minMins });

    // Check cached result for this specific query
    const cached = await cacheGet<PlayerNormalized[]>(cacheKey, CACHE_TTL.PLAYERS);

    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data,
        meta: {
          lastUpdated: new Date(cached.timestamp).toISOString(),
          sourceStatus: "fresh",
        },
      });
    }

    // Fetch and normalize with deduplication
    const result = await dedupeRequest(cacheKey, async () => {
      const bootstrapResult = await fetchBootstrap();

      // Normalize all players from bootstrap
      let players = normalizePlayers(bootstrapResult.data);

      // Apply filters
      if (position) {
        players = players.filter((p) => p.position === position);
      }

      if (team) {
        players = players.filter((p) => p.teamId === team);
      }

      if (minMins) {
        const minMinsMap = new Map(
          bootstrapResult.data.elements.map((e) => [e.id, e.minutes])
        );
        players = players.filter((p) => (minMinsMap.get(p.id) ?? 0) >= minMins);
      }

      // Sort by dimension
      if (sort) {
        const sortKey = sort as SortKey;
        players = [...players].sort((a, b) => b.features[sortKey] - a.features[sortKey]);
      } else {
        // Default: sort by reality score
        players = [...players].sort((a, b) => b.reality.score - a.reality.score);
      }

      return {
        players,
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus: bootstrapResult.sourceStatus,
      };
    });

    // Cache the filtered/sorted result
    await cacheSet(cacheKey, result.players, CACHE_TTL.PLAYERS);

    return NextResponse.json({
      data: result.players,
      meta: {
        lastUpdated: result.lastUpdated,
        sourceStatus: result.sourceStatus,
      },
    });
  } catch (error) {
    console.error("[API /players] Error:", error);

    // Degraded mode: try default cache
    const defaultCacheKey = CACHE_KEYS.PLAYERS({});
    const staleCache = await cacheGet<PlayerNormalized[]>(defaultCacheKey, CACHE_TTL.PLAYERS * 10);
    if (staleCache) {
      return NextResponse.json({
        data: staleCache.data,
        meta: {
          lastUpdated: new Date(staleCache.timestamp).toISOString(),
          sourceStatus: "stale",
        },
      });
    }

    return NextResponse.json(
      {
        data: [],
        meta: {
          lastUpdated: new Date().toISOString(),
          sourceStatus: "stale",
        },
      },
      { status: 503 }
    );
  }
}
