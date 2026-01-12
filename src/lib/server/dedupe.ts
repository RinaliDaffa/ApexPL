import "server-only";
// =============================================================================
// Apex PL — Request Deduplication (Server-Only)
// =============================================================================

// In-flight requests map for deduplication
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Dedupe concurrent requests to the same endpoint
 * Prevents multiple simultaneous requests to FPL for the same data
 */
export async function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if request is already in flight
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  // Create new request and track it
  const request = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request);
  return request;
}
