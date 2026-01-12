/**
 * Canonical narrative resolver for fixture cards.
 * Single source of truth for deriving tags and chips from momentum data.
 */

import type { FixtureNormalized } from "./types";

export type FixturePrimaryTag =
  | "Momentum Mismatch"
  | "Momentum Clash"
  | "Closer Than It Looks"
  | "Trap Game"
  | "Unpredictable"
  | "Post-Match Read"
  | "Momentum Pending";

export type LevelLabel = "Fine margins" | "Swing game" | "Big gap" | "Awaiting data";
export type Variant = "danger" | "warm" | "active" | "neutral" | "gray" | "muted";

export interface FixtureNarrativeResult {
  primary: FixturePrimaryTag;
  chips: string[]; // max 2
  delta: number; // abs(home - away), 0 if null
  leader: "home" | "away" | "level" | "unknown";
  levelLabel: LevelLabel;
  variant: Variant;
  // Debug info
  homeScore: number | null;
  awayScore: number | null;
}

// Type guard for finite number
function isFiniteNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Resolve narrative tag and chips for a fixture based on momentum contrast.
 * Uses consistent thresholds to avoid tag spam.
 * Properly handles null/NaN with "Momentum Pending".
 */
export function resolveFixtureNarrative(fixture: FixtureNormalized): FixtureNarrativeResult {
  const home = fixture.momentumContrast?.homeScore;
  const away = fixture.momentumContrast?.awayScore;

  // If either score is not finite, return pending state
  if (!isFiniteNum(home) || !isFiniteNum(away)) {
    return {
      primary: "Momentum Pending",
      chips: ["Awaiting data"],
      delta: 0,
      leader: "unknown",
      levelLabel: "Awaiting data",
      variant: "gray",
      homeScore: isFiniteNum(home) ? home : null,
      awayScore: isFiniteNum(away) ? away : null,
    };
  }

  // Both scores are valid finite numbers
  const diff = away - home; // Positive means away is higher
  const abs = Math.abs(diff);

  // Determine leader
  const leader: "home" | "away" | "level" = diff < 0 ? "home" : diff > 0 ? "away" : "level";

  // Determine level label based on thresholds
  let levelLabel: LevelLabel;
  if (abs >= 20) {
    levelLabel = "Big gap";
  } else if (abs >= 10) {
    levelLabel = "Swing game";
  } else {
    levelLabel = "Fine margins";
  }

  // Special case: Finished match
  if (fixture.finished) {
    const chips: string[] = [levelLabel];

    // Check for momentum upset
    if (fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
      const winner =
        fixture.homeScore > fixture.awayScore ? "home" : fixture.awayScore > fixture.homeScore ? "away" : "level";

      // Upset = winner opposite of momentum leader
      if (winner !== "level" && leader !== "level" && winner !== leader) {
        chips.push("Momentum upset");
      } else if (winner !== "level") {
        chips.push("Momentum held");
      }
    }

    return {
      primary: "Post-Match Read",
      chips: chips.slice(0, 2),
      delta: abs,
      leader,
      levelLabel,
      variant: "muted",
      homeScore: home,
      awayScore: away,
    };
  }

  // Special case: Live match (started but not finished)
  if (fixture.started && !fixture.finished) {
    const chips: string[] = [levelLabel];
    if (leader !== "level") {
      chips.push(leader === "home" ? "Home edge" : "Away surge");
    }

    return {
      primary: "Unpredictable",
      chips: chips.slice(0, 2),
      delta: abs,
      leader,
      levelLabel,
      variant: "active",
      homeScore: home,
      awayScore: away,
    };
  }

  // Upcoming match - derive base tag from momentum difference
  let primary: FixturePrimaryTag;
  let variant: Variant;
  let secondaryChip: string;

  if (abs >= 20) {
    // Large gap
    primary = "Momentum Mismatch";
    variant = "danger";
    secondaryChip = leader === "away" ? "Away surge" : "Home edge";
  } else if (abs >= 10) {
    // Moderate gap
    if (leader === "away") {
      primary = "Trap Game";
      variant = "warm";
      secondaryChip = "Swing game";
    } else {
      primary = "Momentum Clash";
      variant = "active";
      secondaryChip = "Home leverage";
    }
  } else {
    // Small gap
    primary = "Closer Than It Looks";
    variant = "neutral";
    secondaryChip = "Fine margins";
  }

  return {
    primary,
    chips: [levelLabel, secondaryChip].filter((c, i, arr) => arr.indexOf(c) === i).slice(0, 2),
    delta: abs,
    leader,
    levelLabel,
    variant,
    homeScore: home,
    awayScore: away,
  };
}

/**
 * Get style classes for a primary tag
 */
export function getTagStyles(tag: FixturePrimaryTag): { bg: string; text: string; glow: string } {
  const styles: Record<FixturePrimaryTag, { bg: string; text: string; glow: string }> = {
    "Momentum Mismatch": {
      bg: "bg-status-hot/12",
      text: "text-status-hot",
      glow: "shadow-[0_0_8px_rgba(255,0,90,0.2)]",
    },
    "Momentum Clash": {
      bg: "bg-accent-mint/12",
      text: "text-accent-mint",
      glow: "shadow-[0_0_8px_rgba(0,255,135,0.2)]",
    },
    "Closer Than It Looks": {
      bg: "bg-status-cooling/12",
      text: "text-status-cooling",
      glow: "shadow-[0_0_8px_rgba(160,130,255,0.2)]",
    },
    "Trap Game": {
      bg: "bg-status-unstable/12",
      text: "text-status-unstable",
      glow: "shadow-[0_0_8px_rgba(255,215,90,0.25)]",
    },
    Unpredictable: {
      bg: "bg-accent-mint/12",
      text: "text-accent-mint",
      glow: "shadow-[0_0_8px_rgba(0,255,135,0.2)]",
    },
    "Post-Match Read": {
      bg: "bg-white/[0.08]",
      text: "text-text-muted",
      glow: "",
    },
    "Momentum Pending": {
      bg: "bg-white/[0.05]",
      text: "text-text-faint",
      glow: "",
    },
  };

  return styles[tag] || styles["Momentum Pending"];
}
