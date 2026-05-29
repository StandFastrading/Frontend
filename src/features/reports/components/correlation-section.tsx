"use client";

import { GitCompareArrows } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import type {
  CorrelationRow,
  CorrelationSection as CorrelationSectionData,
} from "@/features/reports/reports-engine";
import { cn } from "@/lib/utils";

// SECTION 4 — Correlation Report.
//
// The most important section. Performance broken down by behavioral
// condition so the trader can see which behaviors help and which hurt.

export function CorrelationSection({
  data,
}: {
  data: CorrelationSectionData;
}) {
  const rows: CorrelationRow[] = [
    data.followingRules,
    data.afterStopWidening,
    data.afterWarningOverride,
    data.duringControlledSessions,
    data.duringEscalatingSessions,
  ];
  return (
    <SectionShell
      icon={GitCompareArrows}
      eyebrow="Section 4"
      title="Performance × Behavior Correlations"
      description="The trader's edge under each behavioral condition. Look for the rows where average R drops."
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <CorrelationRowCard key={row.id} row={row} />
        ))}
      </ul>
    </SectionShell>
  );
}

function CorrelationRowCard({ row }: { row: CorrelationRow }) {
  const tone = toneFor(row);
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-background/30 p-3",
        tone.border,
      )}
      title={row.description}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {row.label}
        </span>
        <span className="ml-auto text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground/60">
          {row.tradeCount} trade{row.tradeCount === 1 ? "" : "s"}
        </span>
      </div>
      {row.hasData ? (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Win Rate" value={`${row.winRate.toFixed(1)}%`} tone={tone.winRate} />
          <Stat label="Avg R" value={row.averageRLabel} tone={tone.avgR} />
          <Stat label="Net P/L" value={row.netPnLLabel} tone={tone.pnl} />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          Not observed in this timeframe.
        </span>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", tone ?? "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function toneFor(row: CorrelationRow): {
  border: string;
  winRate: string;
  avgR: string;
  pnl: string;
} {
  if (!row.hasData) {
    return {
      border: "border-white/10",
      winRate: "text-muted-foreground",
      avgR: "text-muted-foreground",
      pnl: "text-muted-foreground",
    };
  }
  // For the "favorable" rows we want positive numbers to read green;
  // for the "unfavorable" rows the heuristic is the same — green is
  // good, red is bad — because each cell encodes the OBSERVED outcome
  // regardless of which behavioral condition produced it.
  const winTone =
    row.winRate >= 50 ? "text-emerald-300" : "text-rose-300";
  const rTone =
    row.averageR > 0
      ? "text-emerald-300"
      : row.averageR < 0
        ? "text-rose-300"
        : "text-foreground";
  const pnlTone =
    row.netPnL > 0
      ? "text-emerald-300"
      : row.netPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const borderTone =
    row.averageR > 0.5
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : row.averageR < -0.5
        ? "border-rose-500/30 bg-rose-500/[0.04]"
        : "border-white/10";
  return {
    border: borderTone,
    winRate: winTone,
    avgR: rTone,
    pnl: pnlTone,
  };
}
