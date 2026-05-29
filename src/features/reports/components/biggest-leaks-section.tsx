"use client";

import { AlertTriangle } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import type { LeakRow } from "@/features/reports/reports-engine";

// SECTION 6 — Biggest Leaks.
//
// Top 3 behavioral performance destroyers. Evidence-based only —
// surfaces only behaviors actually observed in the window.

export function BiggestLeaksSection({ rows }: { rows: LeakRow[] }) {
  return (
    <SectionShell
      icon={AlertTriangle}
      eyebrow="Section 6"
      title="Biggest Leaks"
      description="Top three behavioral performance destroyers, ranked by frequency then estimated cost."
    >
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <LeakItem key={row.behaviorTag} row={row} index={index} />
          ))}
        </ol>
      )}
    </SectionShell>
  );
}

function LeakItem({ row, index }: { row: LeakRow; index: number }) {
  return (
    <li className="grid grid-cols-[auto_1.4fr_repeat(2,minmax(0,1fr))] items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-rose-300/80">
        #{index + 1}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-foreground">
          {row.behaviorLabel}
        </span>
        <span className="text-[0.6rem] text-muted-foreground">
          {row.observedTrades} trade{row.observedTrades === 1 ? "" : "s"} ·{" "}
          {row.observedSessions} session{row.observedSessions === 1 ? "" : "s"}
        </span>
      </div>
      <Cell label="Estimated Cost" value={row.estimatedCostLabel} tone="rose" />
      <Cell label="Sessions" value={String(row.observedSessions)} />
    </li>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "rose";
}) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <span
        className={
          "text-sm font-semibold tabular-nums " +
          (tone === "rose" ? "text-rose-300" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/[0.03] p-4 text-xs text-emerald-200/80">
      No recurring behavioral leaks observed in this timeframe.
    </div>
  );
}
