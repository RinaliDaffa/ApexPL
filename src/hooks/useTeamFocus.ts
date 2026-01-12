"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, TeamFocus } from "@/lib/types";

async function fetchTeamFocus(id: number): Promise<ApiResponse<TeamFocus>> {
  const response = await fetch(`/api/teams/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch team: ${response.status}`);
  }
  return response.json();
}

export function useTeamFocus(id: number) {
  return useQuery({
    queryKey: ["team", id],
    queryFn: () => fetchTeamFocus(id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: id > 0,
  });
}
