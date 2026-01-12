"use client";

export function FixtureSkeletonCard() {
  return (
    <div
      className="
        relative overflow-hidden
        bg-bg-1 rounded-[16px] border border-border-card-inner
        p-4 min-h-[140px]
      "
      role="status"
      aria-label="Loading fixture data"
    >
      {/* Shimmer overlay - respects prefers-reduced-motion via CSS */}
      <div
        className="
          absolute inset-0 -translate-x-full
          bg-gradient-to-r from-transparent via-white/[0.03] to-transparent
          motion-safe:animate-[shimmer_2s_infinite]
        "
        aria-hidden="true"
      />

      {/* Teams row skeleton */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-white/[0.06] rounded" />
          <div className="h-4 w-10 bg-white/[0.04] rounded-full" />
        </div>
        <div className="h-3 w-4 bg-white/[0.04] rounded" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-10 bg-white/[0.04] rounded-full" />
          <div className="h-4 w-12 bg-white/[0.06] rounded" />
        </div>
      </div>

      {/* Kickoff time skeleton */}
      <div className="flex justify-center mb-3">
        <div className="h-3 w-20 bg-white/[0.04] rounded" />
      </div>

      {/* Momentum bars skeleton */}
      <div className="flex items-center justify-center gap-1 mb-3">
        <div className="flex-1 flex justify-end">
          <div className="h-2 w-1/2 bg-white/[0.04] rounded-full" />
        </div>
        <div className="w-px h-4 bg-white/[0.06]" />
        <div className="flex-1 flex justify-start">
          <div className="h-2 w-1/3 bg-white/[0.04] rounded-full" />
        </div>
      </div>

      {/* Tag pill skeleton */}
      <div className="flex justify-center">
        <div className="h-5 w-24 bg-white/[0.06] rounded-full" />
      </div>
    </div>
  );
}

export function FixtureSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <FixtureSkeletonCard key={i} />
      ))}
    </div>
  );
}
