"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, ComparePayload } from "@/lib/types";

async function fetchCompare(a: number, b: number): Promise<ApiResponse<ComparePayload>> {
  const response = await fetch(`/api/compare?a=${a}&b=${b}`);
  if (!response.ok) {
    throw new Error(`Failed to compare players: ${response.status}`);
  }
  return response.json();
}

export function useCompare(a: number, b: number) {
  return useQuery({
    queryKey: ["compare", a, b],
    queryFn: () => fetchCompare(a, b),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: a > 0 && b > 0,
  });
}
