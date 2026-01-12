import { NextRequest, NextResponse } from "next/server";
import { fetchBootstrap, fetchFixtures, isMatchday as checkMatchday, getCurrentGameweek } from "@/lib/server/fpl-client";
import { normalizeTeams, normalizeFixtures } from "@/lib/server/normalize";
import { FixturesQuerySchema } from "@/lib/server/schemas";
import type { ApiResponse, FixtureNormalized } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper to find a GW with fixtures via fallback search
async function findGWWithFixtures(
  requestedEvent: number,
  isMatchdayNow: boolean,
  maxSteps = 3
): Promise<{ fixtures: Awaited<ReturnType<typeof fetchFixtures>>; resolvedEvent: number }> {
  // Try the requested GW first
  let fixturesResult = await fetchFixtures(requestedEvent, isMatchdayNow);
  
  // Check if there are ANY fixtures (even with null kickoff - they exist in the GW)
  if (fixturesResult.data.length > 0) {
    return { fixtures: fixturesResult, resolvedEvent: requestedEvent };
  }

  // Fallback search: N-1, N+1, N-2, N+2, N-3, N+3
  for (let step = 1; step <= maxSteps; step++) {
    // Try lower GW
    if (requestedEvent - step >= 1) {
      fixturesResult = await fetchFixtures(requestedEvent - step, isMatchdayNow);
      if (fixturesResult.data.length > 0) {
        return { fixtures: fixturesResult, resolvedEvent: requestedEvent - step };
      }
    }

    // Try higher GW
    if (requestedEvent + step <= 38) {
      fixturesResult = await fetchFixtures(requestedEvent + step, isMatchdayNow);
      if (fixturesResult.data.length > 0) {
        return { fixtures: fixturesResult, resolvedEvent: requestedEvent + step };
      }
    }
  }

  // No fixtures found in range, return empty with requested event
  return { fixtures: fixturesResult, resolvedEvent: requestedEvent };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FixtureNormalized[]>>> {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryResult = FixturesQuerySchema.safeParse({
      event: searchParams.get("event") || undefined,
    });

    const requestedEvent = queryResult.success ? queryResult.data.event : undefined;

    // Fetch bootstrap to check matchday status
    const bootstrapResult = await fetchBootstrap();
    const isMatchdayNow = checkMatchday(bootstrapResult.data);
    
    // Get current gameweek from bootstrap (no extra fetch)
    const currentGW = getCurrentGameweek(bootstrapResult.data);
    const currentEvent = currentGW?.id;

    // Determine which event to fetch, with fallback
    let fixturesResult;
    let resolvedEvent: number | undefined;

    if (requestedEvent !== undefined) {
      // User requested a specific GW - use fallback if empty
      const fallbackResult = await findGWWithFixtures(requestedEvent, isMatchdayNow);
      fixturesResult = fallbackResult.fixtures;
      resolvedEvent = fallbackResult.resolvedEvent;
    } else {
      // No specific GW requested - fetch all or current
      fixturesResult = await fetchFixtures(undefined, isMatchdayNow);
      resolvedEvent = undefined;
    }

    // Normalize teams for momentum data
    const teams = normalizeTeams(bootstrapResult.data, fixturesResult.data);

    // Normalize fixtures with momentum + narrative (filter null kickoff for display)
    const fixtures = normalizeFixtures(fixturesResult.data, teams, true);

    // DEV-ONLY: Check for suspicious low diff distribution
    if (process.env.NODE_ENV !== "production" && fixtures.length > 0) {
      const diffs = fixtures.map((f) => Math.abs(f.momentumContrast.homeScore - f.momentumContrast.awayScore));
      const lowDiffCount = diffs.filter((d) => d <= 3).length;
      const lowDiffPercent = (lowDiffCount / diffs.length) * 100;
      
      if (lowDiffPercent > 70) {
        console.warn(
          `[Matchday] Suspicious low diff distribution: ${lowDiffPercent.toFixed(0)}% of fixtures have diff ≤ 3`,
          `\nExample diffs:`,
          diffs.slice(0, 5).map((d) => `Δ${d}`).join(", ")
        );
      }
      
      // Log diff distribution for debugging
      console.log(
        `[Matchday] Diff distribution: ${fixtures.slice(0, 5).map((f) => 
          `${f.homeTeam.shortName} vs ${f.awayTeam.shortName}: ${f.momentumContrast.homeScore}-${f.momentumContrast.awayScore} (Δ${Math.abs(f.momentumContrast.homeScore - f.momentumContrast.awayScore)})`
        ).join("\n  ")}`
      );
    }

    const sourceStatus =
      bootstrapResult.sourceStatus === "stale" || fixturesResult.sourceStatus === "stale"
        ? "stale"
        : "fresh";

    return NextResponse.json({
      data: fixtures,
      meta: {
        lastUpdated: fixturesResult.lastUpdated,
        sourceStatus,
        currentEvent,
        requestedEvent,
        resolvedEvent,
      },
    });
  } catch (error) {
    console.error("[API /fixtures] Error:", error);

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
