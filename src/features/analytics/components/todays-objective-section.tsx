"use client";

import {
  TodaysObjectiveCardForTimeframe,
} from "@/features/analytics/components/todays-objective-card";
import { useTimeframe } from "@/lib/analytics/timeframe";

// SECTION — Today's Objective
//
// Analytics-page mounting of the shared TodaysObjectiveCard. Consumes
// the page's active timeframe so the objective updates if the trader
// switches between 7d / 30d / 90d windows. Empty state and engine
// logic live in the shared card / engine.

export function TodaysObjectiveSection() {
  const { timeframe } = useTimeframe();
  return (
    <section aria-label="Today's behavioral objective">
      <TodaysObjectiveCardForTimeframe timeframe={timeframe} variant="section" />
    </section>
  );
}
