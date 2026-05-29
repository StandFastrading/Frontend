"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";

import { useWeeklyBehaviorReview } from "@/features/analytics/components/weekly-review-card";
import type {
  ReviewSection,
  ReviewSectionConfidence,
  WeeklyTrendDirection,
} from "@/lib/analytics/weekly-behavior-review-engine";
import { cn } from "@/lib/utils";

// =============================================================================
// Analytics Weekly Review — premium accordion
// =============================================================================
//
// CONTRACT (Behavior Analytics only):
//   * Five sections, collapsed by default. Each section renders the
//     engine's `summary` line and a chevron.
//   * Tapping a section reveals its `explanation` + supporting
//     metadata (confidence reasoning). Only ONE section may be open
//     at a time — opening another closes the previous.
//   * Target height collapsed: 180–240 px. Expands naturally.
//   * Engine output is identical to the Dashboard surface; only the
//     chrome differs.
//
// The Dashboard surface uses a separate component (`WeeklyReview` in
// features/dashboard/components/weekly-review.tsx). Both consume the
// same engine via `useWeeklyBehaviorReview`.
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

type SectionKey =
  | "strength"
  | "issue"
  | "intervention"
  | "trend"
  | "focus";

type SectionRow = {
  key: SectionKey;
  label: string;
  summary: string;
  summarySuffix?: string;
  explanation: string;
  confidence: ReviewSectionConfidence | null;
  confidenceLabel: string | null;
  toneClass: string;
};

export function WeeklyReviewAccordion() {
  const review = useWeeklyBehaviorReview();
  const [openKey, setOpenKey] = useState<SectionKey | null>(null);

  if (review.hasInsufficientHistory) {
    return <EmptyState sessionCount={review.windowSessionCount} />;
  }

  const trendDirection: WeeklyTrendDirection =
    review.weeklyTrendDirection ?? "insufficient";
  const confidenceTone = CONFIDENCE_CHIP[review.overallConfidence];

  const sections: SectionRow[] = [
    rowFromSection({
      key: "strength",
      label: "Top Strength",
      section: review.strongestBehavior,
      toneClass: "text-emerald-300",
    }),
    rowFromSection({
      key: "issue",
      label: "Recurring Issue",
      section: review.recurringIssue,
      toneClass: "text-rose-300",
    }),
    rowFromSection({
      key: "intervention",
      label: "Intervention Response",
      section: review.interventionQuality,
      toneClass: "text-foreground/85",
    }),
    {
      key: "trend",
      label: "Weekly Trend",
      summary: TREND_LABEL[trendDirection],
      summarySuffix: TREND_GLYPH[trendDirection],
      explanation:
        review.weeklyTrend?.explanation ?? "Insufficient data this week.",
      confidence: review.weeklyTrend?.confidence ?? null,
      confidenceLabel: review.weeklyTrend?.confidenceLabel ?? null,
      toneClass: TREND_TONE[trendDirection],
    },
    rowFromSection({
      key: "focus",
      label: "Next Week Focus",
      section: review.nextWeekFocus,
      toneClass: "text-brand",
    }),
  ];

  return (
    <div
      className="flex flex-col rounded-xl border border-white/10 bg-card/40 backdrop-blur"
      data-testid="analytics-weekly-review-accordion"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <CalendarRange className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Weekly Review
        </span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
            confidenceTone.ring,
            confidenceTone.text,
          )}
        >
          {review.overallConfidenceLabel} Confidence
        </span>
      </div>

      {/* Sections */}
      <ul className="flex flex-col border-t border-white/5">
        {sections.map((row, idx) => (
          <AccordionItem
            key={row.key}
            row={row}
            open={openKey === row.key}
            isLast={idx === sections.length - 1}
            onToggle={() =>
              setOpenKey((prev) => (prev === row.key ? null : row.key))
            }
          />
        ))}
      </ul>
    </div>
  );
}

function rowFromSection(input: {
  key: SectionKey;
  label: string;
  section: ReviewSection | null;
  toneClass: string;
}): SectionRow {
  return {
    key: input.key,
    label: input.label,
    summary: trimSummary(input.section?.summary),
    explanation:
      input.section?.explanation ?? "No data recorded this week.",
    confidence: input.section?.confidence ?? null,
    confidenceLabel: input.section?.confidenceLabel ?? null,
    toneClass: input.section ? input.toneClass : "text-muted-foreground",
  };
}

function AccordionItem({
  row,
  open,
  isLast,
  onToggle,
}: {
  row: SectionRow;
  open: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "border-white/5",
        !isLast ? "border-b" : "",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`weekly-review-acc-${row.key}`}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            {row.label}
          </span>
          <span
            className={cn(
              "truncate text-sm font-semibold",
              row.toneClass,
            )}
            title={row.summary}
          >
            {row.summary}
            {row.summarySuffix ? (
              <span aria-hidden className="ml-1 text-sm leading-none">
                {row.summarySuffix}
              </span>
            ) : null}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      <div
        id={`weekly-review-acc-${row.key}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-5 pb-4">
            <p className="text-xs leading-relaxed text-foreground/85">
              {row.explanation}
            </p>
            {row.confidenceLabel ? (
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Confidence reasoning · {row.confidenceLabel} —
                inherited from the source engine for this section.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ sessionCount }: { sessionCount: number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
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
