import { NextResponse } from "next/server";
import { fetchBootstrap } from "@/lib/server/fpl-client";
import { normalizePlayers } from "@/lib/server/normalize";
import type { PlayerNormalized, ApiResponse, ApiMeta } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Player detail payload - v1.2 (FPL-only, no Wikidata)
 */
interface PlayerDetailPayload {
  fplMetrics: PlayerNormalized;
  highlights: string[];
  meta: ApiMeta;
}

/**
 * Generate "Why he's on fire" highlights from player metrics
 * Strictly data-driven, no hallucinated facts
 */
function generateHighlights(player: PlayerNormalized): string[] {
  const highlights: string[] = [];
  const { hype, reality, features, tags } = player;

  // High form
  if (features.form >= 70) {
    highlights.push(`Elite form score of ${features.form} — among the hottest players right now`);
  } else if (features.form >= 50) {
    highlights.push(`Strong form score (${features.form}) indicating consistent recent performances`);
  }

  // Hype vs Reality gap (undervalued)
  const gap = reality.score - hype.score;
  if (gap >= 15) {
    highlights.push(`Undervalued gem: Reality score (${reality.score}) significantly exceeds Hype (${hype.score})`);
  } else if (gap <= -20) {
    highlights.push(`High risk: Hype (${hype.score}) outpaces Reality (${reality.score}) — may be overhyped`);
  }

  // High threat
  if (features.threat >= 70) {
    highlights.push(`Exceptional threat score (${features.threat}) — major goal threat`);
  }

  // High creativity
  if (features.creativity >= 70) {
    highlights.push(`Elite creativity (${features.creativity}) — key chance creator`);
  }

  // Great value
  if (features.value >= 70) {
    highlights.push(`Outstanding value score (${features.value}) — points per million leader`);
  }

  // Tags → highlights
  if (tags.includes("Reliable")) {
    highlights.push("Tagged as 'Reliable' — consistent output week after week");
  }
  if (tags.includes("Trending")) {
    highlights.push("'Trending' — rising transfer activity signals growing confidence");
  }
  if (tags.includes("Undervalued")) {
    highlights.push("Flagged as 'Undervalued' by our analytics");
  }

  // Default if nothing specific
  if (highlights.length === 0) {
    if (reality.score >= 50) {
      highlights.push(`Solid Reality score of ${reality.score} — proven FPL performer`);
    } else {
      highlights.push("Limited data available — monitor upcoming fixtures");
    }
  }

  return highlights.slice(0, 4); // Max 4 bullets
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<PlayerDetailPayload> | { error: string }>> {
  const playerId = parseInt(params.id, 10);

  if (isNaN(playerId) || playerId < 1) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  try {
    // 1. Fetch bootstrap data
    const bootstrapResult = await fetchBootstrap(false);
    const bootstrap = bootstrapResult.data;

    // 2. Find the FPL element
    const fplElement = bootstrap.elements.find((e) => e.id === playerId);
    if (!fplElement) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // 3. Normalize all players (reuses cache) and find this one
    const allPlayers = normalizePlayers(bootstrap);
    const fplMetrics = allPlayers.find((p) => p.id === playerId);

    if (!fplMetrics) {
      return NextResponse.json({ error: "Player normalization failed" }, { status: 500 });
    }

    // 4. Generate highlights
    const highlights = generateHighlights(fplMetrics);

    // 5. Build response
    const payload: PlayerDetailPayload = {
      fplMetrics,
      highlights,
      meta: {
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus: bootstrapResult.sourceStatus,
      },
    };

    return NextResponse.json({
      data: payload,
      meta: payload.meta,
    });
  } catch (error) {
    console.error(`[API /player/${playerId}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 503 }
    );
  }
}
