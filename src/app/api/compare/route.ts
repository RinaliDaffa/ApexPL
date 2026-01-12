import { NextRequest, NextResponse } from "next/server";
import { fetchBootstrap, fetchElementSummary } from "@/lib/server/fpl-client";
import { normalizePlayers } from "@/lib/server/normalize";
import { generateKeyDifferences } from "@/lib/server/scoring";
import { CompareQuerySchema } from "@/lib/server/schemas";
import { cacheGet, cacheSet, CACHE_TTL, CACHE_KEYS } from "@/lib/server/cache";
import { dedupeRequest } from "@/lib/server/dedupe";
import type { ApiResponse, ComparePayload, SortKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Radar dimension configuration
const RADAR_DIMENSIONS: SortKey[] = ["threat", "creativity", "value", "form"];
const RADAR_LABELS: string[] = ["Threat", "Creativity", "Value", "Form"];

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ComparePayload | null>>> {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryResult = CompareQuerySchema.safeParse({
      a: searchParams.get("a"),
      b: searchParams.get("b"),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            lastUpdated: new Date().toISOString(),
            sourceStatus: "fresh",
          },
        },
        { status: 400 }
      );
    }

    const { a, b } = queryResult.data;

    // Check compare cache first
    const cacheKey = CACHE_KEYS.COMPARE(a, b);
    const cached = await cacheGet<ComparePayload>(cacheKey, CACHE_TTL.COMPARE);

    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data,
        meta: {
          lastUpdated: new Date(cached.timestamp).toISOString(),
          sourceStatus: "fresh",
        },
      });
    }

    // Fetch with deduplication
    const result = await dedupeRequest(cacheKey, async () => {
      // Fetch bootstrap for player base data
      const bootstrapResult = await fetchBootstrap();
      const allPlayers = normalizePlayers(bootstrapResult.data);

      const playerA = allPlayers.find((p) => p.id === a);
      const playerB = allPlayers.find((p) => p.id === b);

      if (!playerA || !playerB) {
        return { payload: null, lastUpdated: new Date().toISOString(), sourceStatus: "fresh" as const };
      }

      // ONLY here we call element-summary (exactly 2 players)
      const [historyA, historyB] = await Promise.all([
        fetchElementSummary(a),
        fetchElementSummary(b),
      ]);

      // Generate key differences (max 3)
      const keyDifferences = generateKeyDifferences(
        playerA.features,
        playerB.features,
        playerA.name,
        playerB.name
      ).slice(0, 3);

      const comparePayload: ComparePayload = {
        playerA,
        playerB,
        keyDifferences,
        radarDimensions: RADAR_DIMENSIONS,
        radarLabels: RADAR_LABELS,
      };

      // Determine source status
      const sourceStatus: "fresh" | "stale" =
        bootstrapResult.sourceStatus === "stale" ||
        historyA.sourceStatus === "stale" ||
        historyB.sourceStatus === "stale"
          ? "stale"
          : "fresh";

      return {
        payload: comparePayload,
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus,
      };
    });

    if (!result.payload) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            lastUpdated: result.lastUpdated,
            sourceStatus: result.sourceStatus,
          },
        },
        { status: 404 }
      );
    }

    // Cache the compare result
    await cacheSet(cacheKey, result.payload, CACHE_TTL.COMPARE);

    return NextResponse.json({
      data: result.payload,
      meta: {
        lastUpdated: result.lastUpdated,
        sourceStatus: result.sourceStatus,
      },
    });
  } catch (error) {
    console.error("[API /compare] Error:", error);

    return NextResponse.json(
      {
        data: null,
        meta: {
          lastUpdated: new Date().toISOString(),
          sourceStatus: "stale",
        },
      },
      { status: 503 }
    );
  }
}
