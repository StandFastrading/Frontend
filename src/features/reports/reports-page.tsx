"use client";

import { useMemo, useState } from "react";

import {
  TIMEFRAMES,
  TimeframeContext,
  useTimeframe,
  type TimeframeContextValue,
  type TimeframeId,
} from "@/lib/analytics/timeframe";

import { ReportsHeader } from "@/features/reports/components/reports-header";
import { TradingPerformanceSection } from "@/features/reports/components/trading-performance-section";
import { SetupPerformanceSection } from "@/features/reports/components/setup-performance-section";
import { BehavioralPerformanceSection } from "@/features/reports/components/behavioral-performance-section";
import { CorrelationSection } from "@/features/reports/components/correlation-section";
import { ImprovementSection } from "@/features/reports/components/improvement-section";
import { BiggestLeaksSection } from "@/features/reports/components/biggest-leaks-section";
import { BiggestStrengthsSection } from "@/features/reports/components/biggest-strengths-section";
import { ReportSummarySection } from "@/features/reports/components/report-summary-section";
import { useReportSnapshot } from "@/features/reports/use-report-snapshot";

// Reports — composed shell.
//
// Timeframe state lives at the shell so every section reads the same
// window. The shell derives ONE `ReportSnapshot` from the engine; each
// section is a dumb consumer.

export function ReportsPage() {
  const [timeframeId, setTimeframeId] = useState<TimeframeId>("30d");
  const ctx = useMemo<TimeframeContextValue>(
    () => ({ timeframe: TIMEFRAMES[timeframeId], setTimeframeId }),
    [timeframeId],
  );

  return (
    <TimeframeContext.Provider value={ctx}>
      <div className="flex flex-col gap-4">
        <ReportsHeader />
        <ReportSections />
      </div>
    </TimeframeContext.Provider>
  );
}

// Inner component reads the timeframe from context so the snapshot
// re-derives without re-rendering the static header.
function ReportSections() {
  const { timeframe } = useTimeframe();
  const snapshot = useReportSnapshot(timeframe);
  if (!snapshot.hasData) {
    return <EmptyState />;
  }
  return (
    <>
      <TradingPerformanceSection data={snapshot.trading} />
      <SetupPerformanceSection rows={snapshot.setups} />
      <BehavioralPerformanceSection data={snapshot.behavioral} />
      <CorrelationSection data={snapshot.correlations} />
      <ImprovementSection data={snapshot.progress} />
      <BiggestLeaksSection rows={snapshot.leaks} />
      <BiggestStrengthsSection rows={snapshot.strengths} />
      <ReportSummarySection data={snapshot.summary} />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-8 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Reports
      </span>
      <p className="max-w-md text-sm text-muted-foreground">
        No sessions or closed trades fall inside the selected timeframe.
        Trade a session, then come back — the report fills in automatically.
      </p>
    </div>
  );
}
