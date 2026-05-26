import { z } from "zod";

// Per-session metrics the validation engine consults to enforce daily caps.
// One counter per behavior — keep them separate so analytics can attribute
// warnings to the right pattern.
export const sessionMetricsSchema = z.object({
  dailyLossUsedPercent: z.number(),
  tradesTakenToday: z.number(),
  redTradesToday: z.number(),
  consecutiveLosses: z.number(),
  lastTradeAt: z.string().nullable(),
  cooldownActive: z.boolean(),
  dailyLossLimitBreached: z.boolean(),
});
export type SessionMetrics = z.infer<typeof sessionMetricsSchema>;

export function getDefaultSessionMetrics(): SessionMetrics {
  return {
    dailyLossUsedPercent: 0,
    tradesTakenToday: 0,
    redTradesToday: 0,
    consecutiveLosses: 0,
    lastTradeAt: null,
    cooldownActive: false,
    dailyLossLimitBreached: false,
  };
}
