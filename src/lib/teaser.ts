"use client";

import type { TeamNormalized, MomentumLabel } from "@/lib/types";

// Teaser templates by momentum label
const TEASER_TEMPLATES: Record<string, string[]> = {
  "On Fire": [
    "Absolutely flying right now",
    "Can't stop winning",
    "Peak performance mode",
    "The team to beat",
    "Setting the pace",
    "Ruthless form",
    "Making it look easy",
    "Simply unstoppable",
  ],
  "Rising": [
    "Building serious momentum",
    "Getting into their groove",
    "Climbing the ranks",
    "Finding their rhythm",
    "Starting to click",
    "Confidence growing",
    "On the up",
    "Turning heads lately",
  ],
  "Cooling": [
    "Lost their edge lately",
    "Stuttering a bit",
    "Questions being asked",
    "Need to find answers",
    "Searching for form",
    "Work to do",
    "Not quite clicking",
    "Missing something",
  ],
  "Unstable": [
    "Wildly unpredictable",
    "Chaos mode activated",
    "Anything could happen",
    "Form is a mystery",
    "Anyone's guess",
    "Rollercoaster vibes",
    "Up and down",
    "Hard to read",
  ],
  "Watchlist": [
    "One to watch",
    "Keeping an eye on them",
    "Interesting movements",
    "Worth monitoring",
  ],
  "Stable": [
    "Steady as she goes",
    "Holding firm",
    "Consistent performance",
    "No drama here",
  ]
};

// Chip-based modifiers to add secondary context
const CHIP_MODIFIERS: Record<string, string> = {
  "Goals flowing": "— goals everywhere",
  "Solid defense": "— rock solid at back",
  "Peak form": "— can't put a foot wrong",
  "Building momentum": "— watch this space",
  "Struggling": "— need a reset",
  "Leaky at back": "— defense leaking",
  "Goal threat": "— clinical up front",
  "Hot form": "— red hot",
};

// Track used teasers to ensure variety
const usedTeasers = new Map<string, number>();

export function generateTeaser(team: TeamNormalized, index: number): string {
  const templates = TEASER_TEMPLATES[team.momentum.label];
  
  // Select based on index + team id to get variety
  const baseIndex = (index + team.id) % templates.length;
  let selectedTeaser = templates[baseIndex];
  
  // Check if this teaser is overused (max 3 times)
  const usageCount = usedTeasers.get(selectedTeaser) ?? 0;
  if (usageCount >= 3) {
    for (let i = 0; i < templates.length; i++) {
      const alt = templates[(baseIndex + i) % templates.length];
      const altCount = usedTeasers.get(alt) ?? 0;
      if (altCount < 3) {
        selectedTeaser = alt;
        break;
      }
    }
  }
  
  // Track usage
  usedTeasers.set(selectedTeaser, (usedTeasers.get(selectedTeaser) ?? 0) + 1);
  
  // Add chip modifier sparingly (30% chance, only if teaser is short enough)
  const notableChip = team.chips.find((chip) => CHIP_MODIFIERS[chip]);
  if (notableChip && selectedTeaser.length < 25 && Math.random() > 0.7) {
    selectedTeaser += ` ${CHIP_MODIFIERS[notableChip]}`;
  }
  
  // Ensure teaser doesn't exceed ~50 chars to prevent awkward truncation
  if (selectedTeaser.length > 50) {
    const words = selectedTeaser.split(" ");
    let truncated = "";
    for (const word of words) {
      if ((truncated + " " + word).length <= 48) {
        truncated = truncated ? truncated + " " + word : word;
      } else {
        break;
      }
    }
    selectedTeaser = truncated;
  }
  
  return selectedTeaser;
}

// Reset usage tracking (call when component remounts)
export function resetTeaserTracking() {
  usedTeasers.clear();
}
