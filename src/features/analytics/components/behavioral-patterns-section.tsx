"use client";

import { Brain } from "lucide-react";

import {
  PATTERN_CATEGORIES,
  PATTERN_CATEGORY_LABEL,
  type BehavioralPattern,
  type PatternCategory,
} from "@/lib/patterns/behavioral-pattern-engine";
import { useBehavioralPatterns } from "@/features/analytics/use-behavioral-patterns";

import { PatternCard } from "@/features/analytics/components/pattern-card";

// SECTION — Behavioral Patterns
//
// Cross-session behavioral intelligence. Surfaces recurring rule breaks,
// escalation chains, time-of-day deterioration, improvement trends,
// reflection themes, and dangerous conditions — all from the centralized
// pattern engine. Renders nothing when the engine has no patterns to
// report (early-session, clean week, etc.) so the analytics page stays
// quiet when there's nothing structural to surface.

// Per-category ordering used for both empty-state copy and rendering
// order. Improvement patterns come last so the page doesn't open with
// "good news" before the trader sees the issues.
const CATEGORY_ORDER: PatternCategory[] = [
  "recurring_rule_break",
  "escalation_chain",
  "dangerous_condition",
  "time_of_day",
  "reflection_theme",
  "improvement",
];

function groupByCategory(
  patterns: BehavioralPattern[],
): Map<PatternCategory, BehavioralPattern[]> {
  const out = new Map<PatternCategory, BehavioralPattern[]>();
  for (const c of PATTERN_CATEGORIES) out.set(c, []);
  for (const p of patterns) {
    out.get(p.category)!.push(p);
  }
  return out;
}

export function BehavioralPatternsSection() {
  const result = useBehavioralPatterns();
  const grouped = groupByCategory(result.patterns);
  const totalPatterns = result.patterns.length;

  return (
    <section
      aria-label="Cross-session behavioral patterns"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Patterns
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {result.sessionsAnalyzed} session
          {result.sessionsAnalyzed === 1 ? "" : "s"} analyzed
        </span>
      </div>

      {totalPatterns === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.05] text-foreground/85 ring-1 ring-white/10">
            <Brain className="size-4" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span className="text-sm font-semibold text-foreground">
              No recurring patterns in this window
            </span>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Cross-session patterns surface here when the same behavior
              repeats across multiple sessions, trades, or reflections.
              Nothing structural to report yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {CATEGORY_ORDER.map((category) => {
            const patterns = grouped.get(category) ?? [];
            if (patterns.length === 0) return null;
            return (
              <CategoryBlock
                key={category}
                category={category}
                patterns={patterns}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryBlock({
  category,
  patterns,
}: {
  category: PatternCategory;
  patterns: BehavioralPattern[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-foreground/80">
          {PATTERN_CATEGORY_LABEL[category]}
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground/60">
          {patterns.length} pattern{patterns.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </div>
    </div>
  );
}
