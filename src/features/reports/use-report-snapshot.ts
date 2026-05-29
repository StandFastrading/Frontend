"use client";

import { useMemo } from "react";

import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { deriveTradeHistoryRows } from "@/features/trades/trade-history-engine";
import { useAppStore } from "@/store";
import type { TimeframeDefinition } from "@/lib/analytics/timeframe";

import {
  computeReportSnapshot,
  type ReportSnapshot,
} from "@/features/reports/reports-engine";

// Centralized hook for the Reports page. Builds trade-history rows once,
// then derives a `ReportSnapshot` per selected timeframe. All inputs are
// memoized by reference so cross-section reads stay coherent without
// re-derivation.

export function useReportSnapshot(
  timeframe: TimeframeDefinition,
): ReportSnapshot {
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  const tradeReflections = useAppStore((s) => s.tradeReflections);

  const rows = useMemo(
    () =>
      deriveTradeHistoryRows({
        traderId,
        closedTrades: inputs.closedTrades,
        behaviorEvents: inputs.behaviorEvents,
        monitoringEvents: inputs.monitoringEvents,
        interventions: inputs.interventions,
        tradeReflections,
      }),
    [
      traderId,
      inputs.closedTrades,
      inputs.behaviorEvents,
      inputs.monitoringEvents,
      inputs.interventions,
      tradeReflections,
    ],
  );

  return useMemo(
    () =>
      computeReportSnapshot(
        { ...inputs, traderId, rows },
        timeframe,
        nowMs,
      ),
    [inputs, traderId, rows, timeframe, nowMs],
  );
}
