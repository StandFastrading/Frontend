"use client";

import { cn } from "@/lib/utils";
import type { ReflectionSummarySnapshot } from "@/types";

import { StateBadge } from "@/features/journal/components/state-badge";

// Auto-generated session summary card. Renders the frozen
// `ReflectionSummarySnapshot` from the reflection engine — behavior
// first (state, discipline, override count, etc.), P/L surfaced as a
// muted secondary row at the bottom per the product principle.

type StatProps = {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "emerald" | "amber" | "rose";
};

function Stat({ label, value, tone = "default" }: StatProps) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "rose"
          ? "text-rose-300"
          : "text-foreground";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-semibold tabular-nums leading-tight",
          toneClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ReflectionSummaryCard({
  summary,
}: {
  summary: ReflectionSummarySnapshot;
}) {
  const disciplineTone =
    summary.disciplineScore >= 75
      ? "emerald"
      : summary.disciplineScore >= 55
        ? "amber"
        : "rose";

  return (
    <section
      aria-label="Behavior summary"
      className="rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Behavior Summary
          </span>
          <span className="text-[0.65rem] text-muted-foreground/80">
            Auto-derived from this session&rsquo;s behavioral engine output
          </span>
        </div>
        <StateBadge state={summary.state} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="Discipline Integrity"
          value={
            <>
              {summary.disciplineScore}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                /100
              </span>
            </>
          }
          tone={disciplineTone}
        />
        <Stat
          label="Warning Overrides"
          value={summary.warningOverrides}
          tone={summary.warningOverrides > 0 ? "rose" : "emerald"}
        />
        <Stat
          label="Stop Widen Events"
          value={summary.stopWidenEvents}
          tone={summary.stopWidenEvents > 0 ? "rose" : "emerald"}
        />
        <Stat
          label="Size Escalations"
          value={summary.positionSizeIncreases}
          tone={summary.positionSizeIncreases > 0 ? "amber" : "emerald"}
        />
        <Stat
          label="Rapid Re-entries"
          value={summary.rapidReentries}
          tone={summary.rapidReentries > 0 ? "amber" : "emerald"}
        />
        <Stat
          label="Total Interventions"
          value={summary.totalInterventions}
          tone={summary.totalInterventions > 0 ? "amber" : "emerald"}
        />
        <Stat
          label="Controlled Trades"
          value={summary.cleanExecutions}
          tone="emerald"
        />
        <Stat
          label="Escalation Cluster"
          value={summary.biggestClusterLabel ?? "None"}
          tone={summary.biggestCluster ? "amber" : "emerald"}
        />
      </div>

      {/* P/L row — secondary, muted, NEVER lead. */}
      {summary.pnLToday != null ? (
        <div className="mt-5 flex items-baseline justify-between border-t border-white/5 pt-4 text-xs text-muted-foreground">
          <span className="uppercase tracking-[0.18em]">
            P/L (informational only)
          </span>
          <span className="font-medium tabular-nums text-foreground/70">
            {formatPnL(summary.pnLToday)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
