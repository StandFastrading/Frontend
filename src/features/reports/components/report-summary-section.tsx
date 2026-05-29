"use client";

import { ClipboardList } from "lucide-react";

import { SectionShell } from "@/features/reports/components/section-shell";
import type { ReportSummary } from "@/features/reports/reports-engine";
import type { ProgressTrend } from "@/lib/analytics/behavior-progress-engine";
import { cn } from "@/lib/utils";

// SECTION 8 — Report Summary.
//
// Bottom-of-page synthesis. Strongest area, largest leak, focus, overall
// trend — one line each.

const TREND_TONE: Record<ProgressTrend, string> = {
  improving: "text-emerald-300",
  stable: "text-foreground/80",
  mixed: "text-amber-300",
  deteriorating: "text-rose-300",
};

export function ReportSummarySection({
  data,
}: {
  data: ReportSummary;
}) {
  return (
    <SectionShell
      icon={ClipboardList}
      eyebrow="Section 8"
      title="Report Summary"
      description="The decisive takeaways. Read this if you read nothing else."
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label="Strongest Area" value={data.strongestArea} tone="text-emerald-300" />
        <Row label="Largest Leak" value={data.largestLeak} tone="text-rose-300" />
        <Row label="Focus" value={data.focus} tone="text-foreground" />
        <Row
          label="Overall"
          value={data.overallLabel}
          tone={TREND_TONE[data.overallTrend]}
        />
      </dl>
    </SectionShell>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-background/30 p-3 leading-tight">
      <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className={cn("text-sm font-semibold", tone ?? "text-foreground")}>
        {value}
      </dd>
    </div>
  );
}
