"use client";

import { Brain } from "lucide-react";

import {
  MetricCell,
  SectionShell,
} from "@/features/reports/components/section-shell";
import type { BehavioralPerformance } from "@/features/reports/reports-engine";

// SECTION 3 — Behavioral Performance.
//
// Compact card row. Eight signals, each one already aggregated upstream
// by `computeReportSnapshot`.

export function BehavioralPerformanceSection({
  data,
}: {
  data: BehavioralPerformance;
}) {
  return (
    <SectionShell
      icon={Brain}
      eyebrow="Section 3"
      title="Behavioral Performance"
      description="How the trader behaved — independent of P/L."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCell
          label="Stop Widening"
          value={String(data.stopWideningEvents)}
          secondary="events"
          tone={data.stopWideningEvents === 0 ? "emerald" : "amber"}
        />
        <MetricCell
          label="Warning Override Rate"
          value={`${data.warningOverrideRate.toFixed(1)}%`}
          secondary={`${data.warningOverrideEvents} override${data.warningOverrideEvents === 1 ? "" : "s"}`}
          tone={
            data.warningOverrideRate === 0
              ? "emerald"
              : data.warningOverrideRate >= 33
                ? "rose"
                : "amber"
          }
        />
        <MetricCell
          label="Intervention Response"
          value={`${data.interventionResponseQuality.toFixed(1)}%`}
          secondary="positive decisions"
          tone={
            data.interventionResponseQuality >= 60
              ? "emerald"
              : data.interventionResponseQuality >= 30
                ? "amber"
                : "rose"
          }
        />
        <MetricCell
          label="Discipline Stability"
          value={String(data.disciplineStability)}
          secondary="0-100"
          tone={
            data.disciplineStability >= 70
              ? "emerald"
              : data.disciplineStability >= 40
                ? "amber"
                : "rose"
          }
        />
        <MetricCell
          label="Early Session Deterioration"
          value={String(data.earlySessionDeteriorationEvents)}
          secondary="events"
          tone={data.earlySessionDeteriorationEvents === 0 ? "emerald" : "amber"}
        />
        <MetricCell
          label="Rule Adherence"
          value={`${data.ruleAdherenceRate.toFixed(1)}%`}
          tone={
            data.ruleAdherenceRate >= 70
              ? "emerald"
              : data.ruleAdherenceRate >= 40
                ? "amber"
                : "rose"
          }
        />
        <MetricCell
          label="Clean Session Rate"
          value={`${data.cleanSessionRate.toFixed(1)}%`}
          secondary={`${data.totalSessions} session${data.totalSessions === 1 ? "" : "s"}`}
          tone={
            data.cleanSessionRate >= 60
              ? "emerald"
              : data.cleanSessionRate >= 30
                ? "amber"
                : "rose"
          }
        />
        <MetricCell
          label="Most Common Rule Break"
          value={data.mostCommonRuleBreakLabel ?? "None"}
          tone={data.mostCommonRuleBreak ? "rose" : "emerald"}
        />
      </div>
    </SectionShell>
  );
}
