"use client";

import { BehaviorProgressCardForCurrentTrader } from "@/features/analytics/components/behavior-progress-card";

// SECTION — Behavioral Progress (Analytics page)
//
// Mounts the shared progress card with the canonical 7-day comparison
// window so the Analytics surface and the Dashboard surface answer the
// trader's "Am I getting better?" question identically.

export function BehaviorProgressSection() {
  return (
    <section aria-label="Behavioral progress">
      <BehaviorProgressCardForCurrentTrader
        comparisonWindow="7d"
        variant="section"
      />
    </section>
  );
}
