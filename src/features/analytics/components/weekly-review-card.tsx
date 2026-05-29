"use client";

import { useMemo } from "react";
import { CalendarRange } from "lucide-react";

import {
  computeWeeklyBehaviorReview,
  type ReviewSection,
  type ReviewSectionConfidence,
  type WeeklyBehaviorReview,
} from "@/lib/analytics/weekly-behavior-review-engine";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// =============================================================================
// Weekly Behavioral Review — shared card + hook
// =============================================================================
//
// Mounted on both the Dashboard and the Analytics page. Engine always
// runs against a fixed 7-day window so the same trader sees the same
// summary on both surfaces — no contradictions between tabs.
// =============================================================================

export function useWeeklyBehaviorReview(): WeeklyBehaviorReview {
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  const reflections = useAppStore((s) => s.reflections);
  const tradeReflections = useAppStore((s) => s.tradeReflections);
  const sessionNotes = useAppStore((s) => s.sessionNotes);

  return useMemo(
    () =>
      computeWeeklyBehaviorReview(
        {
          ...inputs,
          traderId,
          reflections,
          tradeReflections,
          sessionNotes,
        },
        nowMs,
      ),
    [inputs, traderId, reflections, tradeReflections, sessionNotes, nowMs],
  );
}

const CONFIDENCE_CHIP_TONE: Record<
  ReviewSectionConfidence,
  { ring: string; text: string }
> = {
  high: {
    ring: "bg-emerald-500/10 ring-emerald-500/30",
    text: "text-emerald-300",
  },
  moderate: {
    ring: "bg-amber-500/10 ring-amber-500/30",
    text: "text-amber-300",
  },
  low: {
    ring: "bg-foreground/[0.05] ring-white/10",
    text: "text-muted-foreground",
  },
};

export function WeeklyReviewCard({
  review,
  variant = "section",
}: {
  review: WeeklyBehaviorReview;
  variant?: "section" | "compact";
}) {
  if (review.hasInsufficientHistory) {
    return (
      <EmptyState
        variant={variant}
        sessionCount={review.windowSessionCount}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-white/10 bg-card/40 backdrop-blur",
        variant === "section" ? "gap-4 p-5" : "gap-3 p-4",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <CalendarRange className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Weekly Review
        </span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
            CONFIDENCE_CHIP_TONE[review.overallConfidence].ring,
            CONFIDENCE_CHIP_TONE[review.overallConfidence].text,
          )}
        >
          {review.overallConfidenceLabel} Confidence
        </span>
      </div>

      <WeeklyReviewSections review={review} variant={variant} />
    </div>
  );
}

// Body-only renderer. Surfaces that want to mount the five-section
// summary inside their own chrome (the Dashboard's compact collapsible
// wrapper) can use this and skip the card's header / border.
export function WeeklyReviewSections({
  review,
  variant = "section",
}: {
  review: WeeklyBehaviorReview;
  variant?: "section" | "compact";
}) {
  if (review.hasInsufficientHistory) return null;
  return (
    <div
      className={cn(
        "flex flex-col",
        variant === "section" ? "gap-4" : "gap-3",
      )}
    >
      <SectionRow section={review.strongestBehavior} variant={variant} />
      <SectionRow section={review.recurringIssue} variant={variant} />
      <SectionRow section={review.interventionQuality} variant={variant} />
      <SectionRow section={review.weeklyTrend} variant={variant} />
      <SectionRow
        section={review.nextWeekFocus}
        variant={variant}
        emphasized
      />
    </div>
  );
}

function SectionRow({
  section,
  variant,
  emphasized = false,
}: {
  section: ReviewSection | null;
  variant: "section" | "compact";
  emphasized?: boolean;
}) {
  if (!section) return null;
  const chipTone = CONFIDENCE_CHIP_TONE[section.confidence];
  return (
    <div className="flex flex-col gap-1 leading-snug">
      <div className="flex items-baseline gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {section.title}
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1",
            chipTone.ring,
            chipTone.text,
          )}
        >
          {section.confidenceLabel}
        </span>
      </div>
      <span
        className={cn(
          "font-semibold text-foreground",
          variant === "section" ? "text-sm" : "text-sm",
          emphasized ? "text-foreground" : "",
        )}
      >
        {section.summary}
      </span>
      <span className="text-xs text-muted-foreground">
        {section.explanation}
      </span>
    </div>
  );
}

function EmptyState({
  variant,
  sessionCount,
}: {
  variant: "section" | "compact";
  sessionCount: number;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 backdrop-blur",
        variant === "section" ? "p-5" : "p-4",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <CalendarRange className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          Weekly Review
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Complete additional sessions before weekly review becomes
          available.
          {sessionCount > 0
            ? ` ${sessionCount} session${sessionCount === 1 ? "" : "s"} recorded so far.`
            : ""}
        </p>
      </div>
    </div>
  );
}

// Convenience wrapper — surfaces that don't already hold the review.
export function WeeklyReviewCardForCurrentTrader({
  variant = "section",
}: {
  variant?: "section" | "compact";
}) {
  const review = useWeeklyBehaviorReview();
  return <WeeklyReviewCard review={review} variant={variant} />;
}
