"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import type { PlayerNormalized, SortKey } from "@/lib/types";

interface MetricRadarSvgProps {
  playerA: PlayerNormalized;
  playerB: PlayerNormalized;
  dimensions: SortKey[];
  labels: string[];
  size?: number;
}

interface Point {
  x: number;
  y: number;
  value: number;
  label: string;
  dimension: string;
}

export function MetricRadarSvg({
  playerA,
  playerB,
  dimensions,
  labels,
  size = 320,
}: MetricRadarSvgProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    dimension: string;
    valueA: number;
    valueB: number;
    x: number;
    y: number;
  } | null>(null);

  const center = size / 2;
  const maxRadius = (size / 2) - 50; // Leave room for labels
  const angleStep = (2 * Math.PI) / dimensions.length;
  const rings = [25, 50, 75, 100];

  // Calculate polygon points
  const getPoints = useCallback(
    (player: PlayerNormalized): Point[] => {
      return dimensions.map((dim, i) => {
        const value = player.features[dim] || 0;
        const normalizedRadius = (value / 100) * maxRadius;
        const angle = i * angleStep - Math.PI / 2; // Start from top
        return {
          x: center + normalizedRadius * Math.cos(angle),
          y: center + normalizedRadius * Math.sin(angle),
          value,
          label: labels[i],
          dimension: dim,
        };
      });
    },
    [dimensions, labels, center, maxRadius, angleStep]
  );

  const pointsA = useMemo(() => getPoints(playerA), [getPoints, playerA]);
  const pointsB = useMemo(() => getPoints(playerB), [getPoints, playerB]);

  // Convert points to SVG path
  const toPath = (points: Point[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Grid ring points
  const getRingPoints = (ringValue: number) => {
    const ringRadius = (ringValue / 100) * maxRadius;
    return dimensions.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: center + ringRadius * Math.cos(angle),
        y: center + ringRadius * Math.sin(angle),
      };
    });
  };

  // Label positions (outside the radar)
  const labelPositions = dimensions.map((_, i) => {
    const labelRadius = maxRadius + 35;
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  const handlePointHover = (dimension: string, x: number, y: number) => {
    const valueA = playerA.features[dimension as SortKey] || 0;
    const valueB = playerB.features[dimension as SortKey] || 0;
    setHoveredPoint({ dimension, valueA, valueB, x, y });
  };

  const handlePointLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="relative">
      <motion.svg
        width={size}
        height={size}
        className="overflow-visible"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <defs>
          {/* Gradients for player polygons */}
          <linearGradient id="gradientA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-mint)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-mint)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gradientB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--highlight-pink)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--highlight-pink)" stopOpacity="0.1" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid rings */}
        {rings.map((ringValue) => {
          const ringPoints = getRingPoints(ringValue);
          const ringPath = ringPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
          return (
            <path
              key={ringValue}
              d={ringPath}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const endX = center + maxRadius * Math.cos(angle);
          const endY = center + maxRadius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {/* Player B polygon (behind) */}
        <motion.path
          d={toPath(pointsB)}
          fill="url(#gradientB)"
          stroke="var(--highlight-pink)"
          strokeWidth="2"
          filter="url(#glowB)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Player A polygon (front) */}
        <motion.path
          d={toPath(pointsA)}
          fill="url(#gradientA)"
          stroke="var(--accent-mint)"
          strokeWidth="2"
          filter="url(#glowA)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Player A points */}
        {pointsA.map((point, i) => (
          <g key={`a-${i}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--accent-mint)"
              className="cursor-pointer transition-transform hover:scale-150"
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${playerA.name} ${point.value}, ${playerB.name} ${pointsB[i].value}`}
              onMouseEnter={() => handlePointHover(point.dimension, point.x, point.y)}
              onMouseLeave={handlePointLeave}
              onFocus={() => handlePointHover(point.dimension, point.x, point.y)}
              onBlur={handlePointLeave}
            />
          </g>
        ))}

        {/* Player B points */}
        {pointsB.map((point, i) => (
          <g key={`b-${i}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--highlight-pink)"
              className="cursor-pointer transition-transform hover:scale-150"
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${playerA.name} ${pointsA[i].value}, ${playerB.name} ${point.value}`}
              onMouseEnter={() => handlePointHover(point.dimension, point.x, point.y)}
              onMouseLeave={handlePointLeave}
              onFocus={() => handlePointHover(point.dimension, point.x, point.y)}
              onBlur={handlePointLeave}
            />
          </g>
        ))}

        {/* Axis labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={labelPositions[i].x}
            y={labelPositions[i].y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[11px] fill-text-muted font-medium"
          >
            {label}
          </text>
        ))}
      </motion.svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-20 px-3 py-2 bg-bg-2 border border-white/10 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: hoveredPoint.x,
            top: hoveredPoint.y - 60,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">
            {labels[dimensions.indexOf(hoveredPoint.dimension as SortKey)]}
          </p>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-mint" />
              <span className="font-mono text-text-strong">{hoveredPoint.valueA}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-highlight-pink" />
              <span className="font-mono text-text-strong">{hoveredPoint.valueB}</span>
            </span>
          </div>
        </motion.div>
      )}

      {/* Screen reader accessible table */}
      <table className="sr-only" aria-label="Player comparison statistics">
        <caption>Comparison of {playerA.name} vs {playerB.name}</caption>
        <thead>
          <tr>
            <th>Metric</th>
            <th>{playerA.name}</th>
            <th>{playerB.name}</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dim, i) => (
            <tr key={dim}>
              <td>{labels[i]}</td>
              <td>{playerA.features[dim]}</td>
              <td>{playerB.features[dim]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
