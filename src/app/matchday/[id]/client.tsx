"use client";

import { useCallback } from "react";
import type { PlayerNormalized } from "@/lib/types";
import { useCompareSelection } from "@/context/CompareContext";

interface PlayerWithInsight extends PlayerNormalized {
  insight: string;
}

interface MatchDetailClientProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: PlayerWithInsight[];
  awayPlayers: PlayerWithInsight[];
  bullets: string[];
  bulletSectionTitle: string;
}

export function MatchDetailClient({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  bullets,
  bulletSectionTitle,
}: MatchDetailClientProps) {
  return (
    <>
      {/* Players on Fire */}
      <section className="card p-5 mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">
          Players on Fire
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home team players */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-mint" />
              <span className="text-sm font-semibold text-text-strong">{homeTeamName}</span>
            </div>
            <div className="space-y-2">
              {homePlayers.length > 0 ? (
                homePlayers.map((player) => (
                  <PlayerMiniCard key={player.id} player={player} accent="mint" />
                ))
              ) : (
                <p className="text-xs text-text-faint">No standout players</p>
              )}
            </div>
          </div>

          {/* Away team players */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-highlight-pink" />
              <span className="text-sm font-semibold text-text-strong">{awayTeamName}</span>
            </div>
            <div className="space-y-2">
              {awayPlayers.length > 0 ? (
                awayPlayers.map((player) => (
                  <PlayerMiniCard key={player.id} player={player} accent="pink" />
                ))
              ) : (
                <p className="text-xs text-text-faint">No standout players</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What to Watch / What Decided It */}
      <section className="card p-5">
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">
          {bulletSectionTitle}
        </h2>
        <ul className="space-y-1.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-mint flex-shrink-0" />
              {bullet}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// Player mini card component with compare integration
function PlayerMiniCard({ player, accent }: { player: PlayerWithInsight; accent: "mint" | "pink" }) {
  const { selectPlayer, isSelected, canSelect } = useCompareSelection();
  
  const selected = isSelected(player.id);
  const canAdd = canSelect();

  const handleSelect = useCallback(() => {
    if (!selected && canAdd) {
      selectPlayer({
        id: player.id,
        name: player.name,
        teamShortName: player.teamShortName,
        position: player.position,
      });
    }
  }, [selectPlayer, player, selected, canAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect]
  );

  // Use explicit colors (Tailwind can't purge template literals)
  const accentBg = accent === "mint" ? "bg-accent-mint/10" : "bg-highlight-pink/10";
  const accentText = accent === "mint" ? "text-accent-mint" : "text-highlight-pink";
  const accentBar = accent === "mint" ? "bg-accent-mint" : "bg-highlight-pink";
  const accentDot = accent === "mint" ? "bg-accent-mint" : "bg-highlight-pink";

  return (
    <div
      className={`
        relative p-3 rounded-xl border transition-all cursor-pointer
        ${selected 
          ? "bg-white/[0.06] border-accent-mint/30 ring-1 ring-accent-mint/20" 
          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
        }
        ${!canAdd && !selected ? "opacity-60 cursor-not-allowed" : ""}
      `}
      tabIndex={0}
      role="button"
      aria-label={`Select ${player.name} for compare`}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Selected check icon */}
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent-mint/20 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-mint" />
          </svg>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
          <span className="text-sm font-semibold text-text-strong">{player.name}</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted uppercase">
          {player.position}
        </span>
      </div>

      {/* Micro-insight */}
      <p className="text-[10px] text-text-faint mb-2 pl-3.5">{player.insight}</p>

      {/* Metric chips */}
      <div className="flex gap-2 mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${accentBg} ${accentText}`}>
          Form {player.features.form}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-text-muted">
          Threat {player.features.threat}
        </span>
      </div>

      {/* TCVF bars */}
      <div className="flex gap-1">
        {(["threat", "creativity", "value", "form"] as const).map((key) => (
          <div key={key} className="flex-1" title={`${key}: ${player.features[key]}`}>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full ${key === "form" ? accentBar : "bg-white/20"}`}
                style={{ width: `${player.features[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
