"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  ambient?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "currentColor",
  showDots = true,
  ambient = false,
}: SparklineProps) {
  // Normalize data - ensure we always have at least some points
  const normalizedData = useMemo(() => {
    if (data.length === 0) return [0, 0, 0];
    if (data.length === 1) return [data[0], data[0], data[0]];
    return data;
  }, [data]);

  // Check if data is flat (all same values)
  const isFlat = useMemo(() => {
    const first = normalizedData[0];
    return normalizedData.every((v) => v === first);
  }, [normalizedData]);

  const points = useMemo(() => {
    const maxVal = Math.max(...normalizedData, 3);
    const minVal = Math.min(...normalizedData, 0);
    const range = maxVal - minVal || 1;

    const xStep = width / Math.max(normalizedData.length - 1, 1);
    const verticalPadding = ambient ? 2 : 4;

    return normalizedData
      .map((value, index) => {
        const x = index * xStep;
        // For flat data, draw in the middle
        const y = isFlat
          ? height / 2
          : height - verticalPadding - ((value - minVal) / range) * (height - verticalPadding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [normalizedData, width, height, ambient, isFlat]);

  const lastPoint = useMemo(() => {
    if (ambient || isFlat) return null;

    const maxVal = Math.max(...normalizedData, 3);
    const minVal = Math.min(...normalizedData, 0);
    const range = maxVal - minVal || 1;

    const xStep = width / Math.max(normalizedData.length - 1, 1);
    const verticalPadding = 4;

    const lastValue = normalizedData[normalizedData.length - 1];
    return {
      x: (normalizedData.length - 1) * xStep,
      y: height - verticalPadding - ((lastValue - minVal) / range) * (height - verticalPadding * 2),
    };
  }, [normalizedData, width, height, ambient, isFlat]);

  // Ambient mode: consistent, subtle micro-sparkline
  if (ambient) {
    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        style={{ minWidth: width, minHeight: height }}
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={isFlat ? 1 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={isFlat ? 0.25 : 0.45}
          strokeDasharray={isFlat ? "2 2" : "none"}
        />
      </svg>
    );
  }

  // Full sparkline with area fill
  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      style={{ minWidth: width, minHeight: height }}
      role="img"
      aria-label={`Form trend: ${normalizedData.join(", ")} points in last ${normalizedData.length} games`}
    >
      <defs>
        <linearGradient id={`sparkGrad-${width}-${height}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {!isFlat && (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#sparkGrad-${width}-${height})`}
        />
      )}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isFlat ? 0.4 : 1}
        strokeDasharray={isFlat ? "3 3" : "none"}
      />

      {/* Last point dot */}
      {showDots && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={color}
          style={{ filter: "drop-shadow(0 0 3px currentColor)" }}
        />
      )}
    </svg>
  );
}
