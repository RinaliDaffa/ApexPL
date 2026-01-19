"use client";
// =============================================================================
// Apex PL — Player Detail Page v1.2
// =============================================================================
// Uses official FPL headshots (always available) instead of Wikidata profiles.

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePlayer } from "@/hooks";
import { useCompareSelection } from "@/context/CompareContext";
import { LastUpdated, TeamCrest } from "@/components/ui";
import { getFplPlayerPhotoUrl } from "@/lib/fplAssets";
import type { PlayerPosition } from "@/lib/types";

// Position color mappings
const POSITION_COLORS: Record<PlayerPosition, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  DEF: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  MID: "bg-green-500/20 text-green-400 border-green-500/40",
  FWD: "bg-red-500/20 text-red-400 border-red-500/40",
};

// Tag color mappings
const TAG_COLORS: Record<string, string> = {
  Reliable: "bg-accent-mint/20 text-accent-mint border-accent-mint/30",
  Trending: "bg-highlight-pink/20 text-highlight-pink border-highlight-pink/30",
  Undervalued: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Overhyped: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function SkeletonPage() {
  return (
    <main className="min-h-screen bg-bg-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="h-5 w-24 bg-bg-1 rounded mb-6 animate-pulse" />
        <div className="card p-6 mb-4">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-full bg-bg-1 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 bg-bg-1 rounded animate-pulse" />
              <div className="h-4 w-32 bg-bg-1 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="card p-6 mb-4 h-48 animate-pulse bg-bg-1" />
        <div className="card p-6 h-32 animate-pulse bg-bg-1" />
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-bg-0 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-text-strong mb-2">Player Not Found</h1>
        <p className="text-text-muted mb-4">{message}</p>
        <Link 
          href="/players"
          className="text-accent-mint hover:underline"
        >
          ← Back to Players
        </Link>
      </div>
    </main>
  );
}

// Progress bar component
function ProgressBar({ 
  value, 
  label, 
  color = "mint",
  showValue = true 
}: { 
  value: number; 
  label: string; 
  color?: "mint" | "pink" | "blue";
  showValue?: boolean;
}) {
  const colorClasses = {
    mint: "bg-accent-mint",
    pink: "bg-highlight-pink",
    blue: "bg-blue-400",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        {showValue && (
          <span className="font-mono text-text-faint">{value}</span>
        )}
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${colorClasses[color]}`}
        />
      </div>
    </div>
  );
}

// TCVF mini bars with tooltips
function TCVFBars({ features }: { features: { threat: number; creativity: number; value: number; form: number } }) {
  const bars = [
    { key: "T", label: "Threat", value: features.threat, color: "bg-red-400" },
    { key: "C", label: "Creativity", value: features.creativity, color: "bg-amber-400" },
    { key: "V", label: "Value", value: features.value, color: "bg-green-400" },
    { key: "F", label: "Form", value: features.form, color: "bg-blue-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {bars.map((bar) => (
        <div 
          key={bar.key} 
          className="text-center group relative"
          role="img"
          aria-label={`${bar.label}: ${bar.value}`}
        >
          <div className="text-[10px] text-text-faint mb-1 font-medium">
            {bar.key}
          </div>
          <div className="h-16 bg-white/5 rounded relative flex items-end justify-center overflow-hidden">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.min(100, bar.value)}%` }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className={`w-full ${bar.color} rounded-t`}
            />
          </div>
          <div className="text-[10px] font-mono text-text-muted mt-1">{bar.value}</div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-2 border border-white/10 rounded text-[10px] text-text-strong opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {bar.label}: {bar.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = typeof params.id === "string" ? parseInt(params.id, 10) : null;
  
  const { data, isLoading, error } = usePlayer(playerId);
  const { selectPlayer, selectedA, selectedB, remove } = useCompareSelection();

  if (isLoading) return <SkeletonPage />;
  if (error || !data) return <ErrorState message={error?.message || "Could not load player"} />;

  const { fplMetrics, highlights, meta } = data;
  
  // Build FPL headshot URL
  const photoUrl = getFplPlayerPhotoUrl(fplMetrics.photo);
  
  // Check compare state
  const isPlayerA = selectedA?.id === fplMetrics.id;
  const isPlayerB = selectedB?.id === fplMetrics.id;
  const isSelected = isPlayerA || isPlayerB;

  const handleCompareClick = () => {
    selectPlayer({
      id: fplMetrics.id,
      name: fplMetrics.name,
      teamShortName: fplMetrics.teamShortName,
      position: fplMetrics.position,
    });
  };

  const handleRemove = () => {
    remove(fplMetrics.id);
  };

  return (
    <main className="min-h-screen bg-bg-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/players"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-mint transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Players
        </Link>

        {/* Header Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 md:p-6 mb-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Portrait */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 mx-auto sm:mx-0">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={`${fplMetrics.name} headshot`}
                  fill
                  className="rounded-full object-cover ring-2 ring-white/10"
                  sizes="112px"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-bg-1 to-bg-2 ring-2 ring-white/10 relative overflow-hidden">
                  {/* Low-opacity monogram */}
                  <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/[0.06] select-none">
                    {fplMetrics.name.charAt(0)}
                  </span>
                  {/* Team crest in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TeamCrest teamCode={fplMetrics.teamCode} shortName={fplMetrics.teamShortName} size={48} />
                  </div>
                </div>
              )}
              {/* Vignette overlay */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]" />
            </div>

            {/* Name + meta */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-text-strong mb-2">
                {fplMetrics.name}
              </h1>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                <TeamCrest teamCode={fplMetrics.teamCode} shortName={fplMetrics.teamShortName} size={20} />
                <span className="text-sm text-text-muted">{fplMetrics.teamShortName}</span>
                
                {/* Position pill */}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${POSITION_COLORS[fplMetrics.position]}`}>
                  {fplMetrics.position}
                </span>
              </div>

              {/* Tags */}
              {fplMetrics.tags.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mb-3">
                  {fplMetrics.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded border ${TAG_COLORS[tag] || "bg-white/5 text-text-muted border-white/10"}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Status */}
              <p className="text-xs text-text-faint">
                {meta.sourceStatus === "fresh" ? "Live" : "Cached"} • {new Date(meta.lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
              </p>
            </div>
          </div>

          {/* Compare action */}
          <div className="flex justify-center sm:justify-start">
            {isSelected ? (
              <button
                onClick={handleRemove}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  flex items-center gap-2 transition-all
                  ${isPlayerA 
                    ? "bg-accent-mint/20 text-accent-mint border border-accent-mint/30" 
                    : "bg-highlight-pink/20 text-highlight-pink border border-highlight-pink/30"
                  }
                `}
                aria-label={`Remove from compare slot ${isPlayerA ? "A" : "B"}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isPlayerA ? "bg-accent-mint text-bg-0" : "bg-highlight-pink text-bg-0"
                }`}>
                  {isPlayerA ? "A" : "B"}
                </span>
                In Compare ({isPlayerA ? "A" : "B"}) — Click to Remove
              </button>
            ) : (
              <button
                onClick={handleCompareClick}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-strong border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
                aria-label="Add to compare"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add to Compare
              </button>
            )}
          </div>
        </motion.section>

        {/* Snapshot Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 md:p-6 mb-4"
        >
          <h2 className="text-lg font-semibold text-text-strong mb-4">Snapshot</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hype vs Reality */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-text-faint uppercase tracking-wider">Hype vs Reality</h3>
              <ProgressBar label="Hype" value={fplMetrics.hype.score} color="pink" />
              <ProgressBar label="Reality" value={fplMetrics.reality.score} color="mint" />
              
              {/* Gap indicator */}
              {Math.abs(fplMetrics.reality.score - fplMetrics.hype.score) >= 10 && (
                <p className="text-xs text-text-muted mt-2">
                  {fplMetrics.reality.score > fplMetrics.hype.score 
                    ? "📈 Reality exceeds Hype — potentially undervalued"
                    : "⚠️ Hype exceeds Reality — may be overhyped"
                  }
                </p>
              )}
            </div>

            {/* TCVF */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-text-faint uppercase tracking-wider">TCVF Profile</h3>
              <TCVFBars features={fplMetrics.features} />
            </div>
          </div>
        </motion.section>

        {/* Why He's On Fire */}
        {highlights.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-5 md:p-6"
          >
            <h2 className="text-lg font-semibold text-text-strong mb-4">
              🔥 Why He&apos;s On Fire
            </h2>
            <ul className="space-y-2">
              {highlights.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="text-accent-mint flex-shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </main>
  );
}
