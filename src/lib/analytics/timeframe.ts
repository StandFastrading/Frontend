"use client";

import { createContext, useContext } from "react";

// =============================================================================
// Behavioral Analytics — Timeframe vocabulary + windowing
// =============================================================================
//
// Single source of truth for the analytics page's time-window selector.
// Every analytics engine takes a `nowMs` + a `windowMs` (or `null` for "all
// time") and filters records by timestamp. The vocabulary stays small and
// stable; new spans can be added here without touching engines.
// =============================================================================

export const TIMEFRAME_IDS = ["today", "7d", "30d", "90d", "all"] as const;
export type TimeframeId = (typeof TIMEFRAME_IDS)[number];

export type TimeframeDefinition = {
  id: TimeframeId;
  label: string;
  // Window size in ms. null = no window (all time).
  windowMs: number | null;
  // Minimum session count for "moderate" confidence on derived insights.
  // Sample-size awareness — engines must not speak with certainty after
  // tiny samples.
  moderateConfidenceMinSessions: number;
  // Minimum session count for "high" confidence.
  highConfidenceMinSessions: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const TIMEFRAMES: Record<TimeframeId, TimeframeDefinition> = {
  today: {
    id: "today",
    label: "Today",
    windowMs: DAY_MS,
    moderateConfidenceMinSessions: 1,
    highConfidenceMinSessions: 1,
  },
  "7d": {
    id: "7d",
    label: "7 Days",
    windowMs: 7 * DAY_MS,
    moderateConfidenceMinSessions: 3,
    highConfidenceMinSessions: 5,
  },
  "30d": {
    id: "30d",
    label: "30 Days",
    windowMs: 30 * DAY_MS,
    moderateConfidenceMinSessions: 8,
    highConfidenceMinSessions: 15,
  },
  "90d": {
    id: "90d",
    label: "90 Days",
    windowMs: 90 * DAY_MS,
    moderateConfidenceMinSessions: 20,
    highConfidenceMinSessions: 40,
  },
  all: {
    id: "all",
    label: "All Time",
    windowMs: null,
    moderateConfidenceMinSessions: 20,
    highConfidenceMinSessions: 40,
  },
};

// -----------------------------------------------------------------------------
// Window check — any record with an ISO timestamp can be filtered through
// this helper. Records older than the window OR with malformed timestamps
// are excluded.
// -----------------------------------------------------------------------------
export function isWithinTimeframe(
  iso: string | undefined,
  timeframe: TimeframeDefinition,
  nowMs: number,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  if (timeframe.windowMs == null) return true;
  return nowMs - t <= timeframe.windowMs;
}

// -----------------------------------------------------------------------------
// Confidence rating — sample-size awareness.
// -----------------------------------------------------------------------------
export const CONFIDENCE_LEVELS = [
  "insufficient",
  "emerging",
  "moderate",
  "high",
] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  insufficient: "Insufficient sample",
  emerging: "Emerging pattern",
  moderate: "Moderate confidence",
  high: "High confidence",
};

// Maps a session count + timeframe to a confidence rating. Used everywhere
// the analytics layer makes a claim about the trader's behavior so the
// page never speaks with certainty after a single session.
export function confidenceFromSampleSize(
  sessionCount: number,
  timeframe: TimeframeDefinition,
): ConfidenceLevel {
  if (sessionCount === 0) return "insufficient";
  if (sessionCount >= timeframe.highConfidenceMinSessions) return "high";
  if (sessionCount >= timeframe.moderateConfidenceMinSessions)
    return "moderate";
  return "emerging";
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

export type TimeframeContextValue = {
  timeframe: TimeframeDefinition;
  setTimeframeId: (id: TimeframeId) => void;
};

export const TimeframeContext = createContext<TimeframeContextValue | null>(
  null,
);

export function useTimeframe(): TimeframeContextValue {
  const ctx = useContext(TimeframeContext);
  if (!ctx) {
    throw new Error(
      "useTimeframe must be used within a TimeframeContext.Provider",
    );
  }
  return ctx;
}
