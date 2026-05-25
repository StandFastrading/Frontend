import type {
  RiskCalculation,
  SessionState,
  TradeInput,
  UserRules,
} from "@/features/desk/types";

export const EMPTY_RISK: RiskCalculation = {
  riskPerShare: null,
  totalTradeRisk: null,
  estimatedReward: null,
  rewardToRiskRatio: null,
  percentOfAccountAtRisk: null,
  projectedDailyRiskAfterTrade: null,
};

// Parses a free-form price input. Returns null for empty, whitespace, or any
// value that isn't a finite number — preserves decimals during typing.
export function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Manual-mode, stocks-only risk calculation. Broker integration will replace
// this with execution-derived values; per-market handlers (options, futures,
// forex, crypto) will live alongside this once those flows are wired up.
export function calculateRisk(
  input: TradeInput,
  rules: UserRules,
  session: SessionState,
): RiskCalculation {
  const { positionSize, direction } = input;
  const entryPrice = parsePrice(input.entryPrice);
  const stopPrice = parsePrice(input.stopPrice);
  const targetPrice = parsePrice(input.targetPrice);

  if (entryPrice == null || stopPrice == null || positionSize == null) {
    return EMPTY_RISK;
  }

  const riskPerShare =
    direction === "Long" ? entryPrice - stopPrice : stopPrice - entryPrice;
  const totalTradeRisk = riskPerShare * positionSize;

  let estimatedReward: number | null = null;
  let rewardToRiskRatio: number | null = null;
  if (targetPrice != null) {
    const rewardPerShare =
      direction === "Long"
        ? targetPrice - entryPrice
        : entryPrice - targetPrice;
    estimatedReward = rewardPerShare * positionSize;
    rewardToRiskRatio =
      riskPerShare > 0 ? rewardPerShare / riskPerShare : null;
  }

  const percentOfAccountAtRisk =
    rules.accountSize > 0
      ? (totalTradeRisk / rules.accountSize) * 100
      : null;

  const projectedDailyRiskAfterTrade =
    percentOfAccountAtRisk != null
      ? session.dailyLossUsedPercent + Math.max(0, percentOfAccountAtRisk)
      : null;

  return {
    riskPerShare,
    totalTradeRisk,
    estimatedReward,
    rewardToRiskRatio,
    percentOfAccountAtRisk,
    projectedDailyRiskAfterTrade,
  };
}
