"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import {
  BEHAVIOR_CLUSTER_LABEL,
  computeBehavioralProfileSnapshot,
} from "@/lib/analytics/behavioral-analytics-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

// SECTION 1 — Behavioral Profile Header
//
// Six hero metrics. Each tile carries sample-size awareness so the page
// never speaks with certainty after a small sample.

const STATE_LABEL = {
  focused: "Focused",
  controlled: "Controlled",
  stable: "Stable",
  overtrading: "Overtrading",
  escalating: "Escalating",
  reactive: "Reactive",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
  locked_down: "Locked Down",
} as const;

const STATE_TONE = {
  focused: "text-emerald-300",
  controlled: "text-emerald-300",
  stable: "text-brand",
  overtrading: "text-brand",
  escalating: "text-amber-300",
  reactive: "text-amber-300",
  impulsive: "text-rose-300",
  fatigued: "text-rose-300",
  locked_down: "text-rose-200",
} as const;

function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur",
        className,
      )}
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
        {label}
      </span>
      {children}
    </div>
  );
}

export function BehavioralProfileHeader() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const snapshot = useMemo(
    () => computeBehavioralProfileSnapshot(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  const TrendIcon =
    snapshot.disciplineTrend === "improving"
      ? ArrowUpRight
      : snapshot.disciplineTrend === "declining"
        ? ArrowDownRight
        : Minus;
  const trendTone =
    snapshot.disciplineTrend === "improving"
      ? "text-emerald-300"
      : snapshot.disciplineTrend === "declining"
        ? "text-rose-300"
        : "text-muted-foreground";

  return (
    <section
      aria-label="Behavioral profile"
      className="rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Behavioral Profile
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground/80">
            {snapshot.sessionCount} session
            {snapshot.sessionCount === 1 ? "" : "s"} in window ·{" "}
            <span className="text-foreground/80">
              {snapshot.confidenceLabel}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Current Behavioral State">
          <span
            className={cn(
              "text-xl font-semibold uppercase tracking-[0.16em]",
              STATE_TONE[snapshot.currentState],
            )}
          >
            {STATE_LABEL[snapshot.currentState]}
          </span>
          <span className="text-[0.7rem] text-muted-foreground">
            Most-frequent state across the window
          </span>
        </Tile>

        <Tile label="Behavioral Stability Score">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {snapshot.stabilityScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <span className="text-[0.7rem] text-muted-foreground">
            {snapshot.stabilityScore >= 80
              ? "Consistent across sessions"
              : snapshot.stabilityScore >= 60
                ? "Moderately consistent"
                : snapshot.stabilityScore >= 40
                  ? "Volatile across sessions"
                  : "Highly volatile across sessions"}
          </span>
        </Tile>

        <Tile label="Session Integrity Trend">
          <div className={cn("flex items-center gap-2", trendTone)}>
            <TrendIcon className="size-4" />
            <span className="text-base font-semibold capitalize">
              {snapshot.disciplineTrend ?? "Insufficient sample"}
            </span>
          </div>
          <span className="text-[0.7rem] text-muted-foreground">
            Avg discipline {snapshot.averageDiscipline}/100 · median{" "}
            {snapshot.medianDiscipline}/100
          </span>
        </Tile>

        <Tile label="Most Common Behavioral Weakness">
          {snapshot.mostCommonWeakness ? (
            <>
              <span className="text-base font-semibold text-foreground">
                {snapshot.mostCommonWeakness.label}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                {BEHAVIOR_CLUSTER_LABEL[snapshot.mostCommonWeakness.cluster]} ·{" "}
                {snapshot.mostCommonWeakness.occurrences} session
                {snapshot.mostCommonWeakness.occurrences === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-foreground/70">
                No recurring weakness
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                No detection fired across this window.
              </span>
            </>
          )}
        </Tile>

        <Tile label="Most Improved Area">
          {snapshot.mostImprovedArea ? (
            <>
              <span className="text-base font-semibold text-emerald-300">
                {snapshot.mostImprovedArea.label}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                {snapshot.mostImprovedArea.firstHalfCount} →{" "}
                {snapshot.mostImprovedArea.secondHalfCount} sessions in
                window halves
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-foreground/70">
                Sample too small
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                Improvement comparison requires more sessions.
              </span>
            </>
          )}
        </Tile>

        <Tile label="Current Discipline Rating">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {snapshot.averageDiscipline}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <span className="text-[0.7rem] text-muted-foreground">
            {snapshot.confidenceLabel}
          </span>
        </Tile>
      </div>
    </section>
  );
}
