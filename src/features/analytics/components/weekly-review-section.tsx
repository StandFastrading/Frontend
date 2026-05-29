"use client";

import { WeeklyReviewAccordion } from "@/features/analytics/components/weekly-review-accordion";

// SECTION — Weekly Behavioral Review (Analytics page)
//
// Mounts the premium accordion variant. The Dashboard surface uses a
// separate summary-card component (features/dashboard/components/
// weekly-review.tsx). Both consume the same engine output.

export function WeeklyReviewSection() {
  return (
    <section aria-label="Weekly behavioral review">
      <WeeklyReviewAccordion />
    </section>
  );
}
