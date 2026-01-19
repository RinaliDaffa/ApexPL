"use client";

import Image from "next/image";
import { useState } from "react";
import { getTeamCrestUrl } from "@/lib/teamCrest";

interface TeamCrestProps {
  teamCode: number; // FPL team.code (NOT team.id!)
  shortName: string;
  size?: number;
  className?: string;
}

/**
 * TeamCrest component - displays team badge with premium fallback.
 * Uses Next/Image for optimized loading with FPL's official Premier League resources.
 * 
 * IMPORTANT: Pass teamCode (from team.code), NOT teamId!
 */
export function TeamCrest({ teamCode, shortName, size = 28, className = "" }: TeamCrestProps) {
  const [hasError, setHasError] = useState(false);
  const crestUrl = getTeamCrestUrl(teamCode);

  // Dev-only mismatch warning
  if (process.env.NODE_ENV !== "production" && teamCode <= 0) {
    console.warn(`[TeamCrest] Missing teamCode for ${shortName}`);
  }

  // Premium fallback: rounded square with team initials
  if (!crestUrl || hasError) {
    return (
      <div
        className={`
          flex items-center justify-center
          rounded-md
          bg-gradient-to-br from-white/[0.08] to-white/[0.02]
          border border-white/[0.08]
          text-text-muted font-semibold uppercase text-[10px]
          select-none
          ${className}
        `}
        style={{ width: size, height: size }}
        aria-label={`${shortName} crest`}
        role="img"
      >
        {shortName.slice(0, 3)}
      </div>
    );
  }

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${shortName} crest`}
      role="img"
    >
      <Image
        src={crestUrl}
        alt={`${shortName} badge`}
        width={size}
        height={size}
        className="object-contain drop-shadow-sm"
        onError={() => setHasError(true)}
        unoptimized // Use direct URL since these are official PL resources
      />
    </div>
  );
}
