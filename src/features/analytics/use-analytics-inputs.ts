"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppStore } from "@/store";
import type { AnalyticsSliceInputs } from "@/lib/analytics/trend-series";

// Centralized hook that assembles the AnalyticsSliceInputs the analytics
// engines need. Reads each slice as a primitive reference (zustand
// memoizes per slice) and wraps the assembly in a useMemo so consumers
// re-render only when something genuinely changes.
//
// Also exposes a `nowMs` that ticks every 60s so time-windowed
// calculations (timeframe filtering, decay) advance smoothly without
// requiring new events.

const TICK_MS = 60_000;

export function useAnalyticsInputs(): {
  inputs: AnalyticsSliceInputs;
  nowMs: number;
} {
  const sessions = useAppStore((s) => s.sessions);
  const behaviorEvents = useAppStore((s) => s.behaviorEvents);
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  const interventions = useAppStore((s) => s.interventions);
  const closedTrades = useAppStore((s) => s.closedTrades);
  const riskRules = useAppStore((s) => s.riskRules);
  const liveSessionMetrics = useAppStore((s) => s.session);
  const activeSessionId = useAppStore((s) => s.activeSessionId);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const inputs = useMemo<AnalyticsSliceInputs>(
    () => ({
      sessions,
      behaviorEvents,
      monitoringEvents,
      interventions,
      closedTrades,
      riskRules,
      liveSessionMetrics,
      activeSessionId,
    }),
    [
      sessions,
      behaviorEvents,
      monitoringEvents,
      interventions,
      closedTrades,
      riskRules,
      liveSessionMetrics,
      activeSessionId,
    ],
  );

  return { inputs, nowMs };
}
