"use client";
// =============================================================================
// Apex PL — usePlayer Hook (Player Detail)
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import type { PlayerDetailPayload } from "@/lib/server/playerProfile";
import type { ApiResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchPlayer(id: number): Promise<PlayerDetailPayload> {
  const response = await fetch(`${API_BASE}/player/${id}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch player: ${response.status}`);
  }
  
  const json: ApiResponse<PlayerDetailPayload> = await response.json();
  return json.data;
}

export function usePlayer(id: number | null) {
  return useQuery({
    queryKey: ["player", id],
    queryFn: () => fetchPlayer(id!),
    enabled: id !== null && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}
