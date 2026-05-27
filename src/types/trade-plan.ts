import { z } from "zod";

import { MARKET_TYPES, TRADE_DIRECTIONS } from "@/types/risk";

// `TradeInput` is the in-flight draft on the Trade Desk — price fields are
// strings so partial decimals survive typing ("99." → "99.50"). It is NOT
// what we persist long-term; that's `TradePlan` below.
export const tradeInputSchema = z.object({
  symbol: z.string(),
  marketType: z.enum(MARKET_TYPES),
  direction: z.enum(TRADE_DIRECTIONS),
  entryPrice: z.string(),
  stopPrice: z.string(),
  targetPrice: z.string(),
  positionSize: z.number().nullable(),
  setupType: z.string(),
  tradePlan: z.string(),
});
export type TradeInput = z.infer<typeof tradeInputSchema>;

// `TradePlan` is the canonical persisted shape — the saved/journaled version
// of a TradeInput with parsed numeric prices. Journal/Reports consume this;
// future broker integration emits this when a plan is acted on.
export const tradePlanSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  marketType: z.enum(MARKET_TYPES),
  direction: z.enum(TRADE_DIRECTIONS),
  entryPrice: z.number(),
  stopPrice: z.number(),
  targetPrice: z.number().nullable(),
  positionSize: z.number(),
  setupType: z.string(),
  tradePlan: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TradePlan = z.infer<typeof tradePlanSchema>;
