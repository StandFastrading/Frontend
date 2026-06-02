import { z } from "zod";

import {
  ACTIVE_TRADE_EXIT_OUTCOMES,
} from "@/types/active-trade";
import { MARKET_TYPES, TRADE_DIRECTIONS } from "@/types/risk";

// Normalized record persisted to the closed-trades archive. Shape is tuned
// for the future Trade History page: only the fields a row in that table
// will need. Lives separately from `ActiveTrade` so the active monitor
// can carry mutable state without polluting the archive shape.
//
// Trade-lifecycle invariant (see also: trade-desk-slice header comment):
// a record only lives here once `logExit` ran on an ActiveTrade. Draft,
// Evaluated, Revised, Abandoned, and Canceled states never produce a
// row in this archive — they emit behavior events instead.

// User-selected reason captured at Log Exit. Replaces the previous
// implicit "trader closed it via Log Exit" with a structured signal the
// classification engine and analytics can attribute behavior against.
// Identifiers persist — add new ones, never rename.
export const EXIT_REASONS = [
  "target_hit",
  "stop_loss_hit",
  "manual_exit_risk_reduction",
  "manual_exit_profit_protection",
  "manual_exit_thesis_failed",
  "manual_exit_emotional",
  "end_of_day_exit",
  "other",
] as const;
export type ExitReason = (typeof EXIT_REASONS)[number];

// User-facing labels for the dropdown + Trade Detail View. Keep in sync
// with the wire identifiers above; renames here are pure copy changes.
export const EXIT_REASON_LABEL: Record<ExitReason, string> = {
  target_hit: "Target Hit",
  stop_loss_hit: "Stop Loss Hit",
  manual_exit_risk_reduction: "Manual Exit - Risk Reduction",
  manual_exit_profit_protection: "Manual Exit - Profit Protection",
  manual_exit_thesis_failed: "Manual Exit - Thesis Failed",
  manual_exit_emotional: "Manual Exit - Emotional Exit",
  end_of_day_exit: "End of Day Exit",
  other: "Other",
};

export const closedTradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  setupType: z.string(),
  marketType: z.enum(MARKET_TYPES),
  direction: z.enum(TRADE_DIRECTIONS),
  // Baseline (frozen-at-approval) prices + size. The trader's plan, not
  // what actually closed.
  entryPrice: z.number(),
  exitPrice: z.number(),
  positionSize: z.number(),
  // Nullable because override-activated trades may have closed without a
  // defined stop — the original risk could not be computed honestly.
  originalRisk: z.number().nullable(),
  realizedPnL: z.number(),
  realizedR: z.number().nullable(),
  outcome: z.enum(ACTIVE_TRADE_EXIT_OUTCOMES),
  // Behavioral metadata aggregated at archive time. Trade History uses these
  // to colorize rows + filter by discipline.
  deviationCount: z.number(),
  mistakeCount: z.number(),
  // Free-text reflection captured at exit (existing field — the broader
  // "what happened during this trade" note). Distinct from `exitNotes`
  // below, which is a quick contextual line tied to the chosen exit
  // reason (e.g. "Cut loss early when price failed to reclaim VWAP").
  exitReflection: z.string().nullable(),
  // Structured exit reason + optional short note. Nullable on older
  // archive records that pre-date this field — the migration leaves
  // them null and consumers render "—" / hide the section.
  exitReason: z.enum(EXIT_REASONS).nullable(),
  exitNotes: z.string().nullable(),
  // Risk-reduction attribution. Populated when `exitReason` is
  // `manual_exit_risk_reduction` AND the actual loss came in smaller
  // than the originally planned stop loss. `lossReductionAmount` is in
  // account currency (>= 0). `lossReductionPercent` is a ratio in
  // [0, 1] of the original planned loss avoided.
  lossReduced: z.boolean().nullable(),
  lossReductionAmount: z.number().nullable(),
  lossReductionPercent: z.number().nullable(),
  approvedAt: z.string(),
  activatedAt: z.string(),
  closedAt: z.string(),
  // Session scope (optional for legacy records — see BehaviorEvent).
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),
});
export type ClosedTrade = z.infer<typeof closedTradeSchema>;
