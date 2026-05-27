import { z } from "zod";

import {
  ACTIVE_TRADE_EXIT_OUTCOMES,
} from "@/types/active-trade";
import { MARKET_TYPES, TRADE_DIRECTIONS } from "@/types/risk";

// Normalized record persisted to the closed-trades archive. Shape is tuned
// for the future Trade History page: only the fields a row in that table
// will need. Lives separately from `ActiveTrade` so the active monitor
// can carry mutable state without polluting the archive shape.

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
  exitReflection: z.string().nullable(),
  approvedAt: z.string(),
  activatedAt: z.string(),
  closedAt: z.string(),
  // Session scope (optional for legacy records — see BehaviorEvent).
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),
});
export type ClosedTrade = z.infer<typeof closedTradeSchema>;
