"use client";

import { Target } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import type { SetupPerformanceRow } from "@/features/reports/reports-engine";
import { cn } from "@/lib/utils";

// SECTION 2 — Setup Performance.
//
// Ranked list of setups by composite strength (win rate + average R). One
// compact row per setup with three figures only.

export function SetupPerformanceSection({
  rows,
}: {
  rows: SetupPerformanceRow[];
}) {
  return (
    <SectionShell
      icon={Target}
      eyebrow="Section 2"
      title="Setup Performance"
      description="Ranked strongest to weakest. Win rate weighted equally with average R."
    >
      {rows.length === 0 ? (
        <EmptyRow message="No closed trades in this timeframe to rank setups." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <SetupRow key={row.setupType} row={row} index={index} />
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function SetupRow({
  row,
  index,
}: {
  row: SetupPerformanceRow;
  index: number;
}) {
  const pnlTone =
    row.netPnL > 0
      ? "text-emerald-300"
      : row.netPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const winRateTone =
    row.winRate >= 50 ? "text-emerald-300" : "text-muted-foreground";
  return (
    <li className="grid grid-cols-[auto_1.4fr_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-lg border border-white/10 bg-background/30 px-3 py-2 text-xs">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
        #{index + 1}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-foreground">
          {row.setupType}
        </span>
        <span className="text-[0.6rem] text-muted-foreground">
          {row.totalTrades} trade{row.totalTrades === 1 ? "" : "s"}
        </span>
      </div>
      <Cell label="Win Rate" value={`${row.winRate.toFixed(1)}%`} tone={winRateTone} />
      <Cell label="Avg R" value={row.averageRLabel} />
      <Cell label="Net P/L" value={row.netPnLLabel} tone={pnlTone} />
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

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-background/30 p-4 text-xs text-muted-foreground">
      {message}
    </div>
  );
}
