"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, TeamNormalized } from "@/lib/types";

async function fetchTeams(): Promise<ApiResponse<TeamNormalized[]>> {
  const response = await fetch("/api/teams");
  if (!response.ok) {
    throw new Error(`Failed to fetch teams: ${response.status}`);
  }
  return response.json();
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}
