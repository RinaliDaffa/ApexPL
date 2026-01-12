"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavLinkProps {
  href: string;
  label: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

function NavLink({ href, label, disabled, disabledTooltip }: NavLinkProps) {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Check if current route matches (exact for / , prefix for others)
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (disabled) {
    return (
      <div 
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span
          className="
            text-[12px] text-text-faint cursor-not-allowed
            px-3 py-2
          "
          aria-disabled="true"
        >
          {label}
        </span>
        {showTooltip && disabledTooltip && (
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-bg-2 border border-white/10 rounded text-[10px] text-text-muted whitespace-nowrap z-50">
            {disabledTooltip}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`
        relative text-[12px] font-medium
        px-3 py-2 min-h-[44px] flex items-center
        transition-colors duration-150
        focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 rounded
        ${isActive 
          ? "text-text-strong" 
          : "text-text-muted hover:text-text"
        }
      `}
    >
      {label}
      {/* Active indicator */}
      {isActive && (
        <span 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-mint"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

export function TopNav() {
  return (
    <nav
      className="
        sticky top-0 z-40
        bg-bg-0/80 backdrop-blur-md
        border-b border-white/[0.04]
      "
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Wordmark */}
          <Link 
            href="/" 
            className="
              text-[14px] font-bold text-text-strong tracking-tight
              hover:text-accent-mint transition-colors
              focus-visible:ring-2 focus-visible:ring-accent-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 rounded
              min-h-[44px] flex items-center
            "
          >
            Apex<span className="text-accent-mint">PL</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <NavLink href="/" label="Snapshot" />
            <NavLink href="/players" label="Players" />
            <NavLink href="/matchday" label="Matchday" />
          </div>
        </div>
      </div>
    </nav>
  );
}
