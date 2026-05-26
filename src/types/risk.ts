import { z } from "zod";

// Shared market + direction enums. Persisted as wire identifiers — never
// rename existing values, only add.

export const TRADE_DIRECTIONS = ["Long", "Short"] as const;
export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];

export const MARKET_TYPES = [
  "Stocks",
  "Options",
  "Futures",
  "Forex",
  "Crypto",
] as const;
export type MarketType = (typeof MARKET_TYPES)[number];

// Output of the validation engine's risk calculation. Every field is
// nullable because risk is only computable once entry, stop, and size are
// all supplied.
export const riskCalculationResultSchema = z.object({
  riskPerShare: z.number().nullable(),
  totalRisk: z.number().nullable(),
  estimatedReward: z.number().nullable(),
  rewardRiskRatio: z.number().nullable(),
  accountRiskPercent: z.number().nullable(),
  projectedDailyRiskPercent: z.number().nullable(),
});
export type RiskCalculationResult = z.infer<typeof riskCalculationResultSchema>;
