"use client";

import {
  DASHBOARD_OBJECTIVE_TIMEFRAME,
  TodaysObjectiveCardForTimeframe,
} from "@/features/analytics/components/todays-objective-card";

// Dashboard mounting of the shared TodaysObjectiveCard. Uses a fixed
// 30-day window so the objective reads as "based on recent history" —
// the dashboard has no timeframe selector, and changing it per-day
// would make the objective feel jumpy.

export function TodaysObjective() {
  return (
    <TodaysObjectiveCardForTimeframe
      timeframe={DASHBOARD_OBJECTIVE_TIMEFRAME}
      variant="compact"
    />
  );
}
