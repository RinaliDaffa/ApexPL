import { NextResponse } from "next/server";
import { fetchBootstrap, fetchFixtures } from "@/lib/server/fpl-client";
import { normalizeTeams } from "@/lib/server/normalize";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "@/lib/server/cache";
import type { ApiResponse, TeamNormalized } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<ApiResponse<TeamNormalized[]>>> {
  const cacheKey = CACHE_KEYS.TEAMS_NORMALIZED;
  
  try {
    // Check derived cache first
    const cached = await cacheGet<TeamNormalized[]>(cacheKey, CACHE_TTL.TEAMS);

    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data,
        meta: {
          lastUpdated: new Date(cached.timestamp).toISOString(),
          sourceStatus: "fresh",
        },
      });
    }

    // Fetch upstream data (with SWR behavior)
    const [bootstrapResult, fixturesResult] = await Promise.all([
      fetchBootstrap(false),
      fetchFixtures(undefined, false),
    ]);

    // Normalize teams
    const teams = normalizeTeams(bootstrapResult.data, fixturesResult.data);

    // Cache normalized result
    await cacheSet(cacheKey, teams, CACHE_TTL.TEAMS);

    // Determine overall source status
    const sourceStatus =
      bootstrapResult.sourceStatus === "stale" || fixturesResult.sourceStatus === "stale"
        ? "stale"
        : "fresh";

    return NextResponse.json({
      data: teams,
      meta: {
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus,
      },
    });
  } catch (error) {
    console.error("[API /teams] Error:", error);

    // Degraded mode: try to serve stale cache
    const staleCache = await cacheGet<TeamNormalized[]>(cacheKey, CACHE_TTL.TEAMS * 10);
    if (staleCache) {
      return NextResponse.json({
        data: staleCache.data,
        meta: {
          lastUpdated: new Date(staleCache.timestamp).toISOString(),
          sourceStatus: "stale",
        },
      });
    }

    // Last resort: empty response with stale status
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
