"use client";

import { TrendingUp } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import {
  PROGRESS_TREND_LABEL,
  type BehaviorProgressRecord,
  type BehaviorProgressSummary,
  type ProgressTrend,
} from "@/lib/analytics/behavior-progress-engine";
import { cn } from "@/lib/utils";

// SECTION 5 — Improvement Report.
//
// Reuses the Behavior Progress engine output. Compact two-column grid of
// behavior records with previous → current values and a trend chip.

const TREND_TONE: Record<
  ProgressTrend,
  { text: string; chip: string; row: string }
> = {
  improving: {
    text: "text-emerald-300",
    chip: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    row: "border-emerald-500/30 bg-emerald-500/[0.04]",
  },
  stable: {
    text: "text-foreground/80",
    chip: "bg-foreground/[0.05] text-muted-foreground ring-white/10",
    row: "border-white/10 bg-background/30",
  },
  mixed: {
    text: "text-amber-300",
    chip: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    row: "border-amber-500/30 bg-amber-500/[0.04]",
  },
  deteriorating: {
    text: "text-rose-300",
    chip: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
    row: "border-rose-500/30 bg-rose-500/[0.05]",
  },
};

export function ImprovementSection({
  data,
}: {
  data: BehaviorProgressSummary;
}) {
  return (
    <SectionShell
      icon={TrendingUp}
      eyebrow="Section 5"
      title="Improvement Report"
      description={
        data.hasInsufficientHistory
          ? "More session history is needed before progress tracking becomes available."
          : `${data.comparisonWindow === "7d" ? "Past 7 days" : "Past 30 days"} vs prior ${data.comparisonWindow === "7d" ? "7 days" : "30 days"}.`
      }
      action={
        data.hasInsufficientHistory ? null : (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
              TREND_TONE[data.overallTrend].chip,
            )}
          >
            {PROGRESS_TREND_LABEL[data.overallTrend]}
          </span>
        )
      }
    >
      {data.hasInsufficientHistory ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-background/30 p-3 text-xs text-muted-foreground">
          Tracked behaviors will appear here once both the current and prior
          windows contain enough sessions.
        </p>
      ) : (
        <>
          <p className="text-xs text-foreground/80">
            {data.overallSummaryCopy}
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.records.map((record) => (
              <ProgressRow key={record.recordId} record={record} />
            ))}
          </ul>
        </>
      )}
    </SectionShell>
  );
}

function ProgressRow({ record }: { record: BehaviorProgressRecord }) {
  const tone = TREND_TONE[record.trend];
  return (
    <li
      className={cn("flex flex-col gap-1 rounded-lg border p-3", tone.row)}
      title={record.explanation}
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {record.behaviorLabel}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {record.previousLabel}{" "}
          <span className="text-muted-foreground">→</span>{" "}
          {record.currentLabel}
        </span>
        <span className={cn("ml-auto text-xs font-semibold", tone.text)}>
          {record.trendArrow} {PROGRESS_TREND_LABEL[record.trend]}
        </span>
      </div>
    </li>
  );
}
