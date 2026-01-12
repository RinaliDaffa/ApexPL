// =============================================================================
// Apex PL — Frontend API Client
// =============================================================================

import type {
  ApiResponse,
  TeamNormalized,
  PlayerNormalized,
  FixtureNormalized,
  ComparePayload,
  PlayersQueryParams,
  FixturesQueryParams,
} from "./types";

const API_BASE = "/api";

async function fetchApi<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

export const api = {
  getTeams: () => fetchApi<TeamNormalized[]>("/teams"),
  getPlayers: (params?: PlayersQueryParams) => fetchApi<PlayerNormalized[]>("/players", params as Record<string, string | number | undefined>),
  getFixtures: (params?: FixturesQueryParams) => fetchApi<FixtureNormalized[]>("/fixtures", params as Record<string, string | number | undefined>),
  getCompare: (a: number, b: number) => fetchApi<ComparePayload | null>("/compare", { a, b }),
};
