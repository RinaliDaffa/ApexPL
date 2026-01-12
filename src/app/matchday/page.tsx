"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { FixtureNormalized, ApiMeta } from "@/lib/types";
import { FixtureCard } from "@/components/ui/FixtureCard";
import { FixtureSkeletonGrid } from "@/components/ui/FixtureSkeletonCard";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { GWSwitcher } from "@/components/ui/GWSwitcher";

// Sort fixtures: Live → Upcoming → Finished, then by kickoff time
function sortFixtures(fixtures: FixtureNormalized[]): FixtureNormalized[] {
  return [...fixtures].sort((a, b) => {
    // Priority: live first, then upcoming, then finished
    const statusPriority = (f: FixtureNormalized) => {
      if (f.started && !f.finished) return 0; // Live
      if (!f.started && !f.finished) return 1; // Upcoming
      return 2; // Finished
    };

    const priorityDiff = statusPriority(a) - statusPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    // Within same status, sort by kickoff time (soonest first for live/upcoming, recent first for finished)
    const timeA = new Date(a.kickoffTime || 0).getTime();
    const timeB = new Date(b.kickoffTime || 0).getTime();
    
    if (statusPriority(a) === 2) {
      // Finished: most recent first
      return timeB - timeA;
    }
    // Live/Upcoming: soonest first
    return timeA - timeB;
  });
}

// Format day label from kickoff time
function getDayLabel(isoTime: string): string {
  if (!isoTime) return "TBD";
  const date = new Date(isoTime);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

// Group fixtures by day
function groupByDay(fixtures: FixtureNormalized[]): Map<string, FixtureNormalized[]> {
  const groups = new Map<string, FixtureNormalized[]>();
  
  for (const fixture of fixtures) {
    const day = getDayLabel(fixture.kickoffTime);
    if (!groups.has(day)) {
      groups.set(day, []);
    }
    groups.get(day)!.push(fixture);
  }
  
  return groups;
}

export default function MatchdayPage() {
  const [fixtures, setFixtures] = useState<FixtureNormalized[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // GW state
  const [currentGW, setCurrentGW] = useState<number | undefined>(undefined);
  const [selectedGW, setSelectedGW] = useState<number>(1);
  const [isGWInitialized, setIsGWInitialized] = useState(false);

  // Fetch fixtures for a specific GW
  const fetchFixtures = useCallback(async (gw?: number) => {
    try {
      setIsLoading(true);
      const response = await api.getFixtures(gw !== undefined ? { event: gw } : undefined);
      setFixtures(response.data);
      setMeta(response.meta);
      setError(null);
      
      // Set currentEvent from meta if available and not yet initialized
      if (!isGWInitialized && response.meta.currentEvent) {
        setCurrentGW(response.meta.currentEvent);
        setSelectedGW(response.meta.currentEvent);
        setIsGWInitialized(true);
      }
    } catch (err) {
      console.error("[Matchday] Failed to fetch fixtures:", err);
      setError("Failed to load fixtures");
    } finally {
      setIsLoading(false);
    }
  }, [isGWInitialized]);

  // Initial fetch - get current GW
  useEffect(() => {
    fetchFixtures();
  }, []);

  // Refetch when selectedGW changes (after initialization)
  useEffect(() => {
    if (isGWInitialized) {
      fetchFixtures(selectedGW);
    }
  }, [selectedGW, isGWInitialized, fetchFixtures]);

  // Handle GW change
  const handleGWChange = useCallback((gw: number) => {
    if (gw >= 1 && gw <= 38) {
      setSelectedGW(gw);
    }
  }, []);

  // Sort and group fixtures
  const sortedFixtures = useMemo(() => sortFixtures(fixtures), [fixtures]);
  const groupedFixtures = useMemo(() => groupByDay(sortedFixtures), [sortedFixtures]);

  // Check if we're showing a different GW than requested (fallback)
  const showingFallback = meta?.resolvedEvent !== undefined && 
                          meta?.requestedEvent !== undefined && 
                          meta.resolvedEvent !== meta.requestedEvent;

  return (
    <main className="container-apex py-8 md:py-12">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4">
          {/* Top row: Title + LastUpdated */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {/* Eyebrow */}
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent-mint font-semibold mb-1 block">
                Matchday
              </span>
              {/* Title */}
              <h1 className="text-h1 text-text-strong mb-2">Rivalry Radar</h1>
              {/* Subtitle */}
              <p className="text-body text-text-muted max-w-md">
                Some fixtures look obvious — until momentum disagrees.
              </p>
            </div>

            {/* LastUpdated */}
            {meta && (
              <div className="sm:text-right">
                <LastUpdated
                  timestamp={meta.lastUpdated}
                  sourceStatus={meta.sourceStatus}
                />
              </div>
            )}
          </div>

          {/* GW Switcher Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <GWSwitcher
              currentGW={currentGW}
              selectedGW={selectedGW}
              onGWChange={handleGWChange}
              isLoading={isLoading}
            />
            
            {/* Fallback hint */}
            {showingFallback && !isLoading && (
              <span className="text-xs text-text-muted bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                Showing GW {meta.resolvedEvent} (GW {meta.requestedEvent} empty)
              </span>
            )}
          </div>
        </div>
      </motion.header>

      {/* Loading State */}
      {isLoading && <FixtureSkeletonGrid count={10} />}

      {/* Error State */}
      {!isLoading && error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center"
        >
          <div className="text-2xl mb-3" aria-hidden="true">
            ⚠️
          </div>
          <h2 className="text-h3 text-text-strong mb-2">Something went wrong</h2>
          <p className="text-body text-text-muted">
            {error}. Try refreshing the page.
          </p>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && fixtures.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center max-w-md mx-auto"
        >
          <div className="text-3xl mb-3" aria-hidden="true">
            📡
          </div>
          <h2 className="text-h3 text-text-strong mb-2">
            Fixtures not scheduled yet for GW {meta?.resolvedEvent ?? selectedGW}
          </h2>
          <p className="text-body text-text-muted">
            Try another gameweek — fixtures update closer to matchday.
          </p>
        </motion.div>
      )}

      {/* Fixture Grid - Grouped by Day */}
      {!isLoading && !error && fixtures.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-8"
        >
          {Array.from(groupedFixtures.entries()).map(([day, dayFixtures], groupIndex) => (
            <section key={day}>
              {/* Day Label */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                  {day}
                </h2>
                <div className="flex-1 h-px bg-white/[0.06]" aria-hidden="true" />
                <span className="text-xs text-text-faint">
                  {dayFixtures.length} {dayFixtures.length === 1 ? "match" : "matches"}
                </span>
              </div>
              
              {/* Auto-fit Responsive Grid */}
              <div 
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                }}
              >
                {dayFixtures.map((fixture, index) => (
                  <motion.div
                    key={fixture.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: (groupIndex * dayFixtures.length + index) * 0.02 }}
                  >
                    <FixtureCard fixture={fixture} />
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </motion.div>
      )}
    </main>
  );
}
