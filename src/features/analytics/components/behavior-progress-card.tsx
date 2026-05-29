"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

import {
  computeBehaviorProgress,
  PROGRESS_TREND_LABEL,
  type BehaviorProgressRecord,
  type BehaviorProgressSummary,
  type ComparisonWindowId,
  type ProgressTrend,
} from "@/lib/analytics/behavior-progress-engine";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// =============================================================================
// Behavioral Progress — shared card + hook
// =============================================================================
//
// One presentation surface used by both the Dashboard and the
// Analytics page. Engine output is identical on both surfaces (both
// use a fixed 7-day comparison window so the trader's "Am I getting
// better?" answer doesn't flip between tabs).
// =============================================================================

export function useBehaviorProgressSummary(
  comparisonWindow: ComparisonWindowId = "7d",
): BehaviorProgressSummary {
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  return useMemo(
    () =>
      computeBehaviorProgress(
        { ...inputs, traderId },
        comparisonWindow,
        nowMs,
      ),
    [inputs, traderId, comparisonWindow, nowMs],
  );
}

const TREND_TONE: Record<
  ProgressTrend,
  { ring: string; text: string; chip: string }
> = {
  improving: {
    ring: "border-emerald-500/30 bg-emerald-500/[0.05]",
    text: "text-emerald-300",
    chip: "bg-emerald-500/10 ring-emerald-500/30 text-emerald-300",
  },
  stable: {
    ring: "border-white/10 bg-card/40",
    text: "text-foreground/85",
    chip: "bg-foreground/[0.05] ring-white/10 text-muted-foreground",
  },
  mixed: {
    ring: "border-amber-500/30 bg-amber-500/[0.05]",
    text: "text-amber-300",
    chip: "bg-amber-500/10 ring-amber-500/30 text-amber-300",
  },
  deteriorating: {
    ring: "border-rose-500/30 bg-rose-500/[0.06]",
    text: "text-rose-300",
    chip: "bg-rose-500/10 ring-rose-500/30 text-rose-300",
  },
};

export function BehaviorProgressCard({
  summary,
  variant = "section",
}: {
  summary: BehaviorProgressSummary;
  variant?: "section" | "compact";
}) {
  if (summary.hasInsufficientHistory) {
    return (
      <EmptyState
        variant={variant}
        currentCount={summary.currentSessionCount}
        previousCount={summary.previousSessionCount}
      />
    );
  }

  const overallTone = TREND_TONE[summary.overallTrend];

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border backdrop-blur",
        overallTone.ring,
        variant === "section" ? "gap-4 p-5" : "gap-3 p-4",
      )}
      data-testid="behavior-progress-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <TrendingUp className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Progress
        </span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
            overallTone.chip,
          )}
        >
          {PROGRESS_TREND_LABEL[summary.overallTrend]}
        </span>
      </div>

      {/* Overall summary line */}
      <p className="text-sm leading-snug text-foreground/85">
        {summary.overallSummaryCopy}
      </p>

      {/* Records grid */}
      <ul
        className={cn(
          "grid grid-cols-1 gap-2",
          variant === "section" ? "sm:grid-cols-2" : "sm:grid-cols-2",
        )}
      >
        {summary.records.map((record) => (
          <ProgressRow key={record.recordId} record={record} />
        ))}
      </ul>

      {/* Footer — comparison window context */}
      <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/60">
        {summary.comparisonWindow === "7d" ? "Past 7 days" : "Past 30 days"} vs
        prior {summary.comparisonWindow === "7d" ? "7 days" : "30 days"} ·{" "}
        {summary.currentSessionCount} vs {summary.previousSessionCount}{" "}
        sessions
      </span>
    </div>
  );
}

function ProgressRow({ record }: { record: BehaviorProgressRecord }) {
  const tone = TREND_TONE[record.trend];
  return (
    <li
      className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-background/30 p-3"
      title={record.explanation}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {record.behaviorLabel}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-sm font-semibold", tone.text)}>
          {record.trendArrow} {PROGRESS_TREND_LABEL[record.trend]}
        </span>
        <span className="ml-auto text-xs tabular-nums text-foreground/80">
          <span className="font-semibold">{record.currentLabel}</span>{" "}
          <span className="text-muted-foreground/70">vs</span>{" "}
          <span className="text-muted-foreground">{record.previousLabel}</span>
        </span>
      </div>
    </li>
  );
}

function EmptyState({
  variant,
  currentCount,
  previousCount,
}: {
  variant: "section" | "compact";
  currentCount: number;
  previousCount: number;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 backdrop-blur",
        variant === "section" ? "p-5" : "p-4",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <TrendingUp className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          Behavioral Progress
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          More session history is needed before progress tracking becomes
          available.
          {currentCount + previousCount > 0
            ? ` ${currentCount} recent · ${previousCount} prior session${
                previousCount === 1 ? "" : "s"
              } recorded so far.`
            : ""}
        </p>
      </div>
    </div>
  );
}

// Convenience wrapper.
export function BehaviorProgressCardForCurrentTrader({
  comparisonWindow = "7d",
  variant = "section",
}: {
  comparisonWindow?: ComparisonWindowId;
  variant?: "section" | "compact";
}) {
  const summary = useBehaviorProgressSummary(comparisonWindow);
  return <BehaviorProgressCard summary={summary} variant={variant} />;
}
