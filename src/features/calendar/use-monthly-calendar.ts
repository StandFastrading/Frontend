"use client";

import { useMemo } from "react";

import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { deriveTradeHistoryRows } from "@/features/trades/trade-history-engine";
import { useAppStore } from "@/store";

import {
  computeMonthlyCalendar,
  todayLocalKey,
  type MonthlyCalendarSummary,
} from "@/features/calendar/calendar-engine";

// Centralized hook that builds Trade History rows once, then derives a
// monthly calendar summary for the supplied anchor. All inputs are
// memoized by reference so changing only the month re-runs aggregation
// without re-deriving rows.

export function useMonthlyCalendar(
  monthAnchor: Date,
): MonthlyCalendarSummary {
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

  const todayDate = useMemo(() => todayLocalKey(nowMs), [nowMs]);

  return useMemo(
    () =>
      computeMonthlyCalendar({
        rows,
        behaviorEvents: inputs.behaviorEvents,
        monthAnchor,
        todayDate,
      }),
    [rows, inputs.behaviorEvents, monthAnchor, todayDate],
  );
}
