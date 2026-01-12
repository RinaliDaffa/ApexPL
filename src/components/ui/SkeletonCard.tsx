"use client";

export function SkeletonCard() {
  return (
    <div
      className="
        relative overflow-hidden
        bg-bg-1 rounded-[16px] border border-border-card-inner
        p-5 min-h-[140px]
      "
      role="status"
      aria-label="Loading team data"
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

      {/* Rank badge skeleton */}
      <div 
        className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-white/[0.06] border-2 border-bg-0"
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-4 w-24 bg-white/[0.06] rounded" />
          <div className="h-3 w-10 bg-white/[0.04] rounded" />
        </div>
        {/* Badge pill skeleton */}
        <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
      </div>

      {/* Teaser lines */}
      <div className="space-y-1.5 mb-4">
        <div className="h-3 w-full bg-white/[0.04] rounded" />
        <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-auto">
        {/* Micro-sparkline placeholder */}
        <div className="h-4 w-12 bg-white/[0.04] rounded" />
        {/* Chevron placeholder */}
        <div className="h-4 w-4 bg-white/[0.04] rounded" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
