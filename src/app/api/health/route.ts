import { NextResponse } from "next/server";
import { isCacheConfigured } from "@/lib/server/cache";
import { fetchBootstrap } from "@/lib/server/fpl-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthResponse {
  ok: boolean;
  cache: "upstash" | "memory";
  timestamp: string;
  fpl?: {
    lastUpdated: string;
    sourceStatus: "fresh" | "stale";
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  try {
    // Check FPL connectivity
    const bootstrapResult = await fetchBootstrap();

    return NextResponse.json({
      ok: true,
      cache: isCacheConfigured() ? "upstash" : "memory",
      timestamp: new Date().toISOString(),
      fpl: {
        lastUpdated: bootstrapResult.lastUpdated,
        sourceStatus: bootstrapResult.sourceStatus,
      },
    });
  } catch (error) {
    console.error("[API /health] Error:", error);

    return NextResponse.json({
      ok: false,
      cache: isCacheConfigured() ? "upstash" : "memory",
      timestamp: new Date().toISOString(),
    });
  }
}
