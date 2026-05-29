"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";

import {
  computeBehavioralObjective,
  type BehavioralObjective,
  type BehavioralObjectiveSummary,
  type ObjectiveConfidence,
} from "@/lib/analytics/behavioral-objective-engine";
import { TIMEFRAMES, type TimeframeDefinition } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// =============================================================================
// Today's Objective — shared card + hook
// =============================================================================
//
// One presentation surface used by both the Behavior Analytics page and
// the Dashboard. The engine output is identical on both surfaces; only
// the timeframe choice differs (analytics: user-selected; dashboard:
// fixed 30-day window so the objective reads as "based on recent
// history" without a per-day flip).
//
// This file exports:
//   * `useBehavioralObjectiveSummary(timeframe)` — memoized engine call
//     that picks up the live store + the analytics inputs once.
//   * `TodaysObjectiveCard({ summary })` — pure presentation.
//   * `TodaysObjectiveCardForTimeframe({ timeframe })` — small wrapper
//     that combines the two for surfaces that don't already have the
//     summary in hand.
// =============================================================================

export function useBehavioralObjectiveSummary(
  timeframe: TimeframeDefinition,
): BehavioralObjectiveSummary {
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  const reflections = useAppStore((s) => s.reflections);
  const tradeReflections = useAppStore((s) => s.tradeReflections);
  const sessionNotes = useAppStore((s) => s.sessionNotes);

  return useMemo(
    () =>
      computeBehavioralObjective(
        {
          ...inputs,
          traderId,
          reflections,
          tradeReflections,
          sessionNotes,
        },
        timeframe,
        nowMs,
      ),
    [inputs, traderId, reflections, tradeReflections, sessionNotes, timeframe, nowMs],
  );
}

const CONFIDENCE_TONE: Record<
  ObjectiveConfidence,
  { ring: string; chip: string; chipText: string }
> = {
  high: {
    ring: "border-emerald-500/40 bg-emerald-500/[0.05]",
    chip: "bg-emerald-500/10 ring-emerald-500/30",
    chipText: "text-emerald-300",
  },
  moderate: {
    ring: "border-amber-500/30 bg-amber-500/[0.04]",
    chip: "bg-amber-500/10 ring-amber-500/30",
    chipText: "text-amber-300",
  },
  low: {
    ring: "border-white/10 bg-card/40",
    chip: "bg-foreground/[0.05] ring-white/10",
    chipText: "text-muted-foreground",
  },
};

export function TodaysObjectiveCard({
  summary,
  variant = "section",
}: {
  summary: BehavioralObjectiveSummary;
  // `section` is the full-width hero card used on the Analytics page.
  // `compact` is the dashboard variant — same content, tighter chrome.
  variant?: "section" | "compact";
}) {
  if (summary.hasInsufficientHistory || summary.primary == null) {
    return (
      <EmptyState
        variant={variant}
        sessionCount={summary.historySessionCount}
      />
    );
  }
  return <ObjectiveCard objective={summary.primary} variant={variant} />;
}

function ObjectiveCard({
  objective,
  variant,
}: {
  objective: BehavioralObjective;
  variant: "section" | "compact";
}) {
  const tone = CONFIDENCE_TONE[objective.confidence];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5 backdrop-blur",
        tone.ring,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <Target className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Today&rsquo;s Objective
        </span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
            tone.chip,
            tone.chipText,
          )}
        >
          {objective.confidenceLabel} Confidence
        </span>
      </div>

      <span
        className={cn(
          "font-semibold leading-tight text-foreground",
          variant === "section" ? "text-xl sm:text-2xl" : "text-lg",
        )}
      >
        {objective.objectiveText}
      </span>

      <div className="flex flex-col gap-1 leading-snug">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Why
        </span>
        <span className="text-xs text-foreground/85">
          {objective.explanation}
        </span>
      </div>

      {objective.supportingTagLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {objective.supportingTagLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground/80 ring-1 ring-white/10"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  variant,
  sessionCount,
}: {
  variant: "section" | "compact";
  sessionCount: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <Target className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span
          className={cn(
            "font-semibold text-foreground",
            variant === "section" ? "text-base" : "text-sm",
          )}
        >
          Today&rsquo;s Objective
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Complete more sessions before personalized objectives become
          available.
          {sessionCount > 0
            ? ` ${sessionCount} session${sessionCount === 1 ? "" : "s"} recorded so far.`
            : ""}
        </p>
      </div>
    </div>
  );
}

// Convenience wrapper for surfaces that don't already hold the summary.
export function TodaysObjectiveCardForTimeframe({
  timeframe,
  variant = "section",
}: {
  timeframe: TimeframeDefinition;
  variant?: "section" | "compact";
}) {
  const summary = useBehavioralObjectiveSummary(timeframe);
  return <TodaysObjectiveCard summary={summary} variant={variant} />;
}

// Re-export the canonical "dashboard window" timeframe so the dashboard
// can mount the card without re-deriving which window is appropriate.
export const DASHBOARD_OBJECTIVE_TIMEFRAME: TimeframeDefinition =
  TIMEFRAMES["30d"];
