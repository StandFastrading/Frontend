"use client";

import { useState } from "react";
import { CalendarRange, ChevronRight, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWeeklyBehaviorReview } from "@/features/analytics/components/weekly-review-card";
import type {
  ReviewSection,
  ReviewSectionConfidence,
  WeeklyBehaviorReview,
  WeeklyTrendDirection,
} from "@/lib/analytics/weekly-behavior-review-engine";
import { cn } from "@/lib/utils";

// =============================================================================
// Dashboard Weekly Review — compact 2x2 summary + dark themed modal
// =============================================================================
//
// CONTRACT (Dashboard only):
//   * Header: calendar icon + "Weekly Review" on the left; confidence
//     chip + "View Full Review" on the right.
//   * Body: 2x2 grid (Top Strength · Recurring Issue · Intervention
//     Response · Weekly Trend). Each cell shows the engine's `summary`
//     only — never `explanation`.
//   * Footer: single "Next Focus: …" line.
//   * Tap "View Full Review" → opens the dark platform-styled modal.
//     The modal renders five dark card rows (label · summary ·
//     explanation · confidence chip).
//
// Engine is unchanged. The Analytics surface uses the separate
// WeeklyReviewAccordion component.
// =============================================================================

const TREND_GLYPH: Record<WeeklyTrendDirection, string> = {
  improving: "↗",
  stable: "→",
  mixed: "↕",
  deteriorating: "↘",
  insufficient: "—",
};

const TREND_LABEL: Record<WeeklyTrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  mixed: "Mixed",
  deteriorating: "Deteriorating",
  insufficient: "Insufficient",
};

const TREND_TONE: Record<WeeklyTrendDirection, string> = {
  improving: "text-emerald-300",
  stable: "text-foreground/85",
  mixed: "text-amber-300",
  deteriorating: "text-rose-300",
  insufficient: "text-muted-foreground",
};

const CONFIDENCE_CHIP: Record<
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

function trimSummary(s: string | undefined | null): string {
  if (!s) return "—";
  const trimmed = s.trim().replace(/[.!?]+$/g, "");
  return trimmed.length > 0 ? trimmed : "—";
}

export function WeeklyReview() {
  const review = useWeeklyBehaviorReview();
  const [modalOpen, setModalOpen] = useState(false);

  if (review.hasInsufficientHistory) {
    return <CompactEmptyState sessionCount={review.windowSessionCount} />;
  }

  const trendDirection: WeeklyTrendDirection =
    review.weeklyTrendDirection ?? "insufficient";
  const confidenceTone = CONFIDENCE_CHIP[review.overallConfidence];

  return (
    <>
      <div
        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur"
        data-testid="dashboard-weekly-review"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
            <CalendarRange className="size-3" />
          </span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Weekly Review
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
                confidenceTone.ring,
                confidenceTone.text,
              )}
            >
              {review.overallConfidenceLabel}
            </span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-background/30 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              View Full Review
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>

        {/* 2x2 body */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <GridCell
            label="Top Strength"
            value={trimSummary(review.strongestBehavior?.summary)}
            tone={review.strongestBehavior ? "emerald" : "muted"}
          />
          <GridCell
            label="Recurring Issue"
            value={trimSummary(review.recurringIssue?.summary)}
            tone={review.recurringIssue ? "rose" : "muted"}
          />
          <GridCell
            label="Intervention Response"
            value={trimSummary(review.interventionQuality?.summary)}
            tone={review.interventionQuality ? "default" : "muted"}
          />
          <GridCell
            label="Weekly Trend"
            customValue={
              <span
                className={cn(
                  "flex items-center gap-1 truncate text-sm font-semibold",
                  TREND_TONE[trendDirection],
                )}
              >
                {TREND_LABEL[trendDirection]}
                <span aria-hidden className="text-base leading-none">
                  {TREND_GLYPH[trendDirection]}
                </span>
              </span>
            }
          />
        </div>

        {/* Footer */}
        <div className="flex min-w-0 items-baseline gap-1.5 border-t border-white/5 pt-2 text-xs">
          <span className="shrink-0 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Next Focus:
          </span>
          <span
            className="min-w-0 flex-1 truncate font-semibold text-brand"
            title={review.nextWeekFocus?.summary ?? "—"}
          >
            {trimSummary(review.nextWeekFocus?.summary)}
          </span>
        </div>
      </div>

      <FullReviewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        review={review}
      />
    </>
  );
}

function GridCell({
  label,
  value,
  customValue,
  tone = "default",
}: {
  label: string;
  value?: string;
  customValue?: React.ReactNode;
  tone?: "emerald" | "rose" | "muted" | "default";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground/90";
  const content =
    customValue ??
    (
      <span
        className={cn("truncate text-sm font-semibold", toneClass)}
        title={value ?? "—"}
      >
        {value ?? "—"}
      </span>
    );
  return (
    <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      {content}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dark themed full-review modal
// -----------------------------------------------------------------------------

function FullReviewModal({
  open,
  onOpenChange,
  review,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  review: WeeklyBehaviorReview;
}) {
  const trendDirection: WeeklyTrendDirection =
    review.weeklyTrendDirection ?? "insufficient";
  const confidenceTone = CONFIDENCE_CHIP[review.overallConfidence];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override the default light-popover background with the
          platform's dark card chrome so the modal reads as part of
          the app, not a foreign popup. */}
      <DialogContent
        showCloseButton={false}
        className="w-[min(720px,calc(100vw-2rem))] max-w-none border border-white/10 bg-card/95 p-0 text-foreground ring-1 ring-foreground/10 backdrop-blur-md"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-white/5 px-6 py-4">
            <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
              <CalendarRange className="size-3.5" />
            </span>
            <div className="flex flex-1 flex-col gap-1 leading-tight">
              <DialogTitle className="text-base font-semibold text-foreground">
                Weekly Behavioral Review
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Five-section behavioral summary from the selected review
                window.
              </DialogDescription>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
                confidenceTone.ring,
                confidenceTone.text,
              )}
            >
              {review.overallConfidenceLabel} Confidence
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto px-6 py-4">
            <ModalSectionRow
              label="Top Strength"
              section={review.strongestBehavior}
              tone="emerald"
            />
            <ModalSectionRow
              label="Recurring Issue"
              section={review.recurringIssue}
              tone="rose"
            />
            <ModalSectionRow
              label="Intervention Response"
              section={review.interventionQuality}
              tone="default"
            />
            <ModalSectionRow
              label="Weekly Trend"
              section={review.weeklyTrend}
              tone="default"
              summaryOverride={
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-semibold",
                    TREND_TONE[trendDirection],
                  )}
                >
                  {TREND_LABEL[trendDirection]}
                  <span aria-hidden className="text-base leading-none">
                    {TREND_GLYPH[trendDirection]}
                  </span>
                </span>
              }
            />
            <ModalSectionRow
              label="Next Week Focus"
              section={review.nextWeekFocus}
              tone="brand"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalSectionRow({
  label,
  section,
  tone,
  summaryOverride,
}: {
  label: string;
  section: ReviewSection | null;
  tone: "emerald" | "rose" | "brand" | "default";
  summaryOverride?: React.ReactNode;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "brand"
          ? "text-brand"
          : "text-foreground/90";

  const confidenceTone =
    section?.confidence != null
      ? CONFIDENCE_CHIP[section.confidence]
      : CONFIDENCE_CHIP.low;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-background/30 p-4">
      <div className="flex items-center gap-2">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {label}
        </span>
        {section?.confidenceLabel ? (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.16em] ring-1",
              confidenceTone.ring,
              confidenceTone.text,
            )}
          >
            {section.confidenceLabel}
          </span>
        ) : null}
      </div>

      {summaryOverride ?? (
        <span className={cn("text-sm font-semibold", toneClass)}>
          {section?.summary ?? "—"}
        </span>
      )}

      {section?.explanation ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {section.explanation}
        </p>
      ) : null}
    </div>
  );
}

function CompactEmptyState({ sessionCount }: { sessionCount: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 px-4 py-3 backdrop-blur">
      <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <CalendarRange className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Weekly Review
        </span>
        <p className="truncate text-xs text-muted-foreground">
          Weekly review will appear after sufficient session history.
          {sessionCount > 0
            ? ` ${sessionCount} session${sessionCount === 1 ? "" : "s"} recorded so far.`
            : ""}
        </p>
      </div>
    </div>
  );
}
