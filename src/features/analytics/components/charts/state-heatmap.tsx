"use client";

import { cn } from "@/lib/utils";
import type { BehavioralStateLabel } from "@/lib/state/behavioral-state-aggregator";

// Severity heatmap for the Session State History chart. Each square = one
// session's peak state across the timeframe. Color encodes severity tier;
// hover surfaces the trading date + state via the native title attribute.

export type StateHeatmapPoint = {
  sessionId: string;
  tradingDate: string;
  peakState: BehavioralStateLabel;
};

const STATE_TILE: Record<BehavioralStateLabel, string> = {
  focused: "bg-emerald-500/40 ring-emerald-500/50",
  controlled: "bg-emerald-500/30 ring-emerald-500/40",
  stable: "bg-brand/30 ring-brand/40",
  overtrading: "bg-brand/45 ring-brand/55",
  escalating: "bg-amber-500/40 ring-amber-500/50",
  reactive: "bg-amber-500/55 ring-amber-500/65",
  impulsive: "bg-rose-500/45 ring-rose-500/55",
  fatigued: "bg-rose-500/55 ring-rose-500/65",
  locked_down: "bg-rose-500/70 ring-rose-500/80",
};

const STATE_LABEL: Record<BehavioralStateLabel, string> = {
  focused: "Focused",
  controlled: "Controlled",
  stable: "Stable",
  overtrading: "Overtrading",
  escalating: "Escalating",
  reactive: "Reactive",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
  locked_down: "Locked Down",
};

export function StateHeatmap({
  points,
  emptyLabel = "Not enough sessions",
  className,
}: {
  points: StateHeatmapPoint[];
  emptyLabel?: string;
  className?: string;
}) {
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
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {points.map((p) => (
        <span
          key={p.sessionId}
          title={`${p.tradingDate} · ${STATE_LABEL[p.peakState]}`}
          className={cn(
            "size-5 rounded-sm ring-1 transition-transform hover:scale-110",
            STATE_TILE[p.peakState],
          )}
        />
      ))}
    </div>
  );
}
