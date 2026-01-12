import { NextRequest, NextResponse } from "next/server";
import { fetchBootstrap, fetchFixtures } from "@/lib/server/fpl-client";
import { normalizeTeams, normalizePlayers, generateTeamFocus } from "@/lib/server/normalize";
import type { ApiResponse, TeamFocus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<TeamFocus | null>>> {
  try {
    const teamId = parseInt(params.id, 10);

    if (isNaN(teamId) || teamId < 1) {
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

    // Fetch upstream data (NO element-summary calls!)
    const [bootstrapResult, fixturesResult] = await Promise.all([
      fetchBootstrap(),
      fetchFixtures(),
    ]);

    const teams = normalizeTeams(bootstrapResult.data, fixturesResult.data);
    const team = teams.find((t) => t.id === teamId);

    if (!team) {
      return NextResponse.json(
        {
          data: null,
          meta: {
            lastUpdated: new Date().toISOString(),
            sourceStatus: "fresh",
          },
        },
        { status: 404 }
      );
    }

    // Get all normalized players from bootstrap (no N+1!)
    const allPlayers = normalizePlayers(bootstrapResult.data);

    // Generate team focus with drivers
    const teamFocus = generateTeamFocus(team, allPlayers, fixturesResult.data);

    const sourceStatus =
      bootstrapResult.sourceStatus === "stale" || fixturesResult.sourceStatus === "stale"
        ? "stale"
        : "fresh";

    return NextResponse.json({
      data: teamFocus,
      meta: {
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus,
      },
    });
  } catch (error) {
    console.error("[API /teams/:id] Error:", error);

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
