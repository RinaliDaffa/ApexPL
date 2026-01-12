"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface CompareCTAProps {
  selectedIds: number[];
}

export function CompareCTA({ selectedIds }: CompareCTAProps) {
  if (selectedIds.length !== 2) return null;

  const [a, b] = selectedIds;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <Link
        href={`/compare?a=${a}&b=${b}`}
        className="
          inline-flex items-center gap-2 px-6 py-3
          bg-accent-mint text-bg-0 font-semibold text-sm
          rounded-full
          shadow-[0_8px_24px_rgba(0,255,135,0.3)]
          hover:shadow-[0_12px_32px_rgba(0,255,135,0.4)]
          transition-all duration-200
          hover:scale-105
        "
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M4 8H12M12 8L8 4M12 8L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Compare (2)
      </Link>
    </motion.div>
  );
}
