"use client";

import { ShieldCheck } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import type { StrengthRow } from "@/features/reports/reports-engine";

// SECTION 7 — Biggest Strengths.
//
// Top 3 positive behaviors. Only surfaces strengths backed by observed
// data — no "great job" filler when the trader has no sessions yet.

export function BiggestStrengthsSection({
  rows,
}: {
  rows: StrengthRow[];
}) {
  return (
    <SectionShell
      icon={ShieldCheck}
      eyebrow="Section 7"
      title="Biggest Strengths"
      description="Top three positive behaviors observed in this timeframe."
    >
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <StrengthItem key={row.id} row={row} index={index} />
          ))}
        </ol>
      )}
    </SectionShell>
  );
}

function StrengthItem({
  row,
  index,
}: {
  row: StrengthRow;
  index: number;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
        #{index + 1}
      </span>
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          {row.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.observation}
        </span>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-background/30 p-4 text-xs text-muted-foreground">
      Trade more sessions to surface positive behavioral strengths.
    </div>
  );
}
