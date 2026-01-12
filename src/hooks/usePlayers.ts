"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, PlayerNormalized, SortKey, PlayerPosition } from "@/lib/types";

export interface PlayersQueryOptions {
  sort?: SortKey;
  position?: PlayerPosition | "all";
  team?: number;
  minMins?: number;
}

async function fetchPlayers(options: PlayersQueryOptions): Promise<ApiResponse<PlayerNormalized[]>> {
  const params = new URLSearchParams();
  if (options.sort) params.set("sort", options.sort);
  if (options.position && options.position !== "all") params.set("position", options.position);
  if (options.team) params.set("team", options.team.toString());
  if (options.minMins !== undefined) params.set("minMins", options.minMins.toString());

  const response = await fetch(`/api/players?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch players: ${response.status}`);
  }
  return response.json();
}

export function usePlayers(options: PlayersQueryOptions = {}) {
  return useQuery({
    queryKey: ["players", options],
    queryFn: () => fetchPlayers(options),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
