"use client";

import { useMemo } from "react";

import {
  computeBehavioralPatterns,
  type BehavioralPatternsResult,
  type PatternEngineInputs,
} from "@/lib/patterns/behavioral-pattern-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAppStore } from "@/store";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";

// =============================================================================
// useBehavioralPatterns
// =============================================================================
//
// Hook that assembles `PatternEngineInputs` and runs the cross-session
// pattern engine against the active timeframe. The analytics page is the
// primary consumer; future surfaces (Journal cross-trade view, AI mentor
// retrieval) can consume the same shape.
//
// Reads `reflections` + `sessionNotes` directly from the store on top of
// the existing analytics inputs so the analytics inputs hook stays narrow.
// =============================================================================

export function useBehavioralPatterns(): BehavioralPatternsResult {
  const { inputs, nowMs } = useAnalyticsInputs();
  const { timeframe } = useTimeframe();
  const reflections = useAppStore((s) => s.reflections);
  const sessionNotes = useAppStore((s) => s.sessionNotes);

  const fullInputs = useMemo<PatternEngineInputs>(
    () => ({ ...inputs, reflections, sessionNotes }),
    [inputs, reflections, sessionNotes],
  );

  return useMemo(
    () => computeBehavioralPatterns(fullInputs, timeframe, nowMs),
    [fullInputs, timeframe, nowMs],
  );
}
