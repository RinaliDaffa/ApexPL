"use client";

interface ChipListProps {
  chips: string[];
  max?: number;
}

export function ChipList({ chips, max = 3 }: ChipListProps) {
  const visibleChips = chips.slice(0, max);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleChips.map((chip, index) => (
        <span
          key={index}
          className="
            inline-flex items-center px-2.5 py-1
            text-[11px] font-medium tracking-wide
            text-text bg-white/6
            border border-white/10
            rounded-full
            backdrop-blur-sm
            shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
          "
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
