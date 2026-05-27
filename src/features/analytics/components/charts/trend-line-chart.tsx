"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

// Minimal SVG line chart for behavioral trend series. Hand-rolled rather
// than pulled from a chart library so the visual language stays inside
// the StandFast design system (subtle gradient fill, premium dark tone,
// no axes clutter). The chart is intentionally informational — readable
// at a glance, not interactive.

export type TrendLineChartPoint = {
  label: string;
  value: number;
};

export type TrendLineChartProps = {
  points: TrendLineChartPoint[];
  // Pinned axis range — when set, the chart uses this rather than fitting
  // to the data. Useful for the discipline score (always 0–100) so charts
  // across the page share a baseline.
  yMin?: number;
  yMax?: number;
  // brand | emerald | amber | rose — tones the line + gradient.
  tone?: "brand" | "emerald" | "amber" | "rose";
  className?: string;
  emptyLabel?: string;
};

const TONE_STROKE: Record<NonNullable<TrendLineChartProps["tone"]>, string> = {
  brand: "stroke-brand",
  emerald: "stroke-emerald-400",
  amber: "stroke-amber-400",
  rose: "stroke-rose-400",
};

const TONE_FILL: Record<NonNullable<TrendLineChartProps["tone"]>, string> = {
  brand: "fill-brand/15",
  emerald: "fill-emerald-400/15",
  amber: "fill-amber-400/15",
  rose: "fill-rose-400/15",
};

const TONE_DOT: Record<NonNullable<TrendLineChartProps["tone"]>, string> = {
  brand: "fill-brand",
  emerald: "fill-emerald-400",
  amber: "fill-amber-400",
  rose: "fill-rose-400",
};

const WIDTH = 320;
const HEIGHT = 96;
const PAD_X = 8;
const PAD_Y = 10;

export function TrendLineChart({
  points,
  yMin,
  yMax,
  tone = "brand",
  className,
  emptyLabel = "Not enough data",
}: TrendLineChartProps) {
  const path = useMemo(() => {
    if (points.length === 0) return { line: "", area: "", dots: [] as Array<{ cx: number; cy: number }> };
    const values = points.map((p) => p.value);
    const lo = yMin ?? Math.min(...values, 0);
    const hi = yMax ?? Math.max(...values, lo + 1);
    const span = Math.max(1, hi - lo);
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_Y * 2;
    const denom = Math.max(1, points.length - 1);
    const x = (i: number) => PAD_X + (i / denom) * innerW;
    const y = (v: number) =>
      PAD_Y + innerH - ((v - lo) / span) * innerH;

    const lineSegs = points.map(
      (p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`,
    );
    const lineD = lineSegs.join(" ");
    const areaD = `${lineD} L ${x(points.length - 1)} ${HEIGHT - PAD_Y} L ${x(0)} ${HEIGHT - PAD_Y} Z`;
    const dots = points.map((p, i) => ({ cx: x(i), cy: y(p.value) }));
    return { line: lineD, area: areaD, dots };
  }, [points, yMin, yMax]);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-[0.7rem] text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-24 w-full", className)}
      role="img"
      aria-label="Behavioral trend chart"
    >
      <path d={path.area} className={cn(TONE_FILL[tone])} stroke="none" />
      <path
        d={path.line}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={cn(TONE_STROKE[tone])}
      />
      {/* Endpoint dot — visual anchor for the most recent reading. */}
      {path.dots.length > 0 ? (
        <circle
          cx={path.dots[path.dots.length - 1].cx}
          cy={path.dots[path.dots.length - 1].cy}
          r={2.5}
          className={cn(TONE_DOT[tone])}
        />
      ) : null}
    </svg>
  );
}
