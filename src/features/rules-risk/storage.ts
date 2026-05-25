import type { RiskRulesConfig } from "@/features/rules-risk/types";

// Mock storage today, backend later. Same load/save API works for both, so
// swapping persistence is a single-file change.
const STORAGE_KEY = "sf_risk_rules";

export const DEFAULT_RISK_RULES: RiskRulesConfig = {
  account: {
    accountSize: 30_000,
    baseRiskPerTradePercent: 1,
    maxDollarRiskPerTrade: 300,
    accountType: "Margin",
    currency: "USD",
  },
  perTrade: {
    requireStopLoss: true,
    minRewardRiskRatio: 2,
    maxPositionSize: 1000,
    maxAddsPerTrade: 1,
    noAveragingDown: true,
    maxOpenPositions: 3,
    setupMustBeApproved: true,
  },
  allowedSetups: [
    "Opening Range Breakout",
    "VWAP Reclaim",
    "Pullback",
    "Breakout Continuation",
    "Trend Reversal",
  ],
  daily: {
    maxDailyLossPercent: 4,
    maxRedTrades: 3,
    maxConsecutiveLosses: 3,
    cooldownAfterLossMinutes: 15,
    lockoutAfterMaxLoss: true,
  },
  behavior: {
    noRevengeTrading: true,
    noTradingAfterEmotionalWarning: true,
    noReentryWithinMinutes: 15,
    noTradesOutsideAllowedSetups: true,
    noOvertrading: true,
  },
  intervention: {
    warningLevel: "standard",
    requireConfirmationBeforeOverride: true,
    reflectionPromptAfterOverride: true,
  },
  lastUpdated: null,
};

export function loadRiskRules(): RiskRulesConfig {
  if (typeof window === "undefined") return DEFAULT_RISK_RULES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RISK_RULES;
    const parsed = JSON.parse(raw) as Partial<RiskRulesConfig> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_RISK_RULES;
    // Shallow merge so missing top-level keys fall back to defaults; this lets
    // us extend the schema later without breaking older saved configs.
    return {
      ...DEFAULT_RISK_RULES,
      ...parsed,
      account: { ...DEFAULT_RISK_RULES.account, ...(parsed.account ?? {}) },
      perTrade: { ...DEFAULT_RISK_RULES.perTrade, ...(parsed.perTrade ?? {}) },
      daily: { ...DEFAULT_RISK_RULES.daily, ...(parsed.daily ?? {}) },
      behavior: { ...DEFAULT_RISK_RULES.behavior, ...(parsed.behavior ?? {}) },
      intervention: {
        ...DEFAULT_RISK_RULES.intervention,
        ...(parsed.intervention ?? {}),
      },
      allowedSetups: parsed.allowedSetups ?? DEFAULT_RISK_RULES.allowedSetups,
    };
  } catch {
    return DEFAULT_RISK_RULES;
  }
}

export function saveRiskRules(config: RiskRulesConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota or serialization error — non-fatal */
  }
}
