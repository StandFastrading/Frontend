"use client";

import { BehaviorProgressCardForCurrentTrader } from "@/features/analytics/components/behavior-progress-card";

// Dashboard mounting of the shared Behavioral Progress card. Fixed
// 7-day comparison so the Dashboard reading matches the Analytics
// surface exactly — no contradictory progress signals between tabs.

export function BehaviorProgress() {
  return (
    <BehaviorProgressCardForCurrentTrader
      comparisonWindow="7d"
      variant="compact"
    />
  );
}
