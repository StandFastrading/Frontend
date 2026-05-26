import { z } from "zod";

// Canonical, flat shape for trader risk configuration. Edited in the
// Rules & Risk page, consumed by the validation engine, persisted via the
// app store.

export const ACCOUNT_TYPES = ["Cash", "Margin", "Futures", "Crypto"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export const WARNING_LEVELS = [
  "soft",
  "standard",
  "strict",
  "hard_lock",
] as const;
export type WarningLevel = (typeof WARNING_LEVELS)[number];

export const riskRulesSchema = z.object({
  // Account
  accountSize: z.number(),
  accountCurrency: z.enum(ACCOUNT_CURRENCIES),
  accountType: z.enum(ACCOUNT_TYPES),

  // Per-trade risk caps
  baseRiskPerTradePercent: z.number(),
  maxDollarRiskPerTrade: z.number(),

  // Daily protections — each cap owns one behavior:
  //   maxDailyTrades         → total trades the user is allowed in a session
  //   maxRedTrades           → losing trades allowed in a session
  //   maxConsecutiveLosses   → losing streak before a forced cool-off
  maxDailyLossPercent: z.number(),
  maxDailyTrades: z.number(),
  maxRedTrades: z.number(),
  maxConsecutiveLosses: z.number(),
  cooldownAfterLossMinutes: z.number(),

  // Per-trade structural rules
  requireStopLoss: z.boolean(),
  minimumRewardRisk: z.number(),
  maxPositionSize: z.number(),
  maxAddsPerTrade: z.number(),
  maxOpenPositions: z.number(),
  noAveragingDown: z.boolean(),
  setupMustBeApproved: z.boolean(),
  allowedSetups: z.array(z.string()),

  // Behavioral guardrails
  noReentryWithinMinutes: z.number(),
  noRevengeTrading: z.boolean(),
  noTradingAfterEmotionalWarning: z.boolean(),
  noTradesOutsideAllowedSetups: z.boolean(),
  noOvertrading: z.boolean(),

  // Intervention preferences
  warningLevel: z.enum(WARNING_LEVELS),
  requireConfirmationBeforeOverride: z.boolean(),
  reflectionPromptAfterOverride: z.boolean(),
  lockoutAfterMaxLoss: z.boolean(),

  // Updated timestamp (null until first save)
  updatedAt: z.string().nullable(),
});

export type RiskRules = z.infer<typeof riskRulesSchema>;

const DEFAULT_ALLOWED_SETUPS = [
  "Opening Range Breakout",
  "VWAP Reclaim",
  "Pullback",
  "Breakout Continuation",
  "Trend Reversal",
];

export function getDefaultRiskRules(): RiskRules {
  return {
    accountSize: 30_000,
    accountCurrency: "USD",
    accountType: "Margin",

    baseRiskPerTradePercent: 1,
    maxDollarRiskPerTrade: 300,

    maxDailyLossPercent: 4,
    maxDailyTrades: 5,
    maxRedTrades: 3,
    maxConsecutiveLosses: 3,
    cooldownAfterLossMinutes: 15,

    requireStopLoss: true,
    minimumRewardRisk: 2,
    maxPositionSize: 1000,
    maxAddsPerTrade: 1,
    maxOpenPositions: 3,
    noAveragingDown: true,
    setupMustBeApproved: true,
    allowedSetups: [...DEFAULT_ALLOWED_SETUPS],

    noReentryWithinMinutes: 15,
    noRevengeTrading: true,
    noTradingAfterEmotionalWarning: true,
    noTradesOutsideAllowedSetups: true,
    noOvertrading: true,

    warningLevel: "standard",
    requireConfirmationBeforeOverride: true,
    reflectionPromptAfterOverride: true,
    lockoutAfterMaxLoss: true,

    updatedAt: null,
  };
}

// Legacy nested shape (pre-flat refactor) → new flat shape. Lets the app
// migrate old localStorage records on first load without losing user
// settings.
export function migrateLegacyRiskRules(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  if (
    !("account" in obj) &&
    !("perTrade" in obj) &&
    !("daily" in obj) &&
    !("behavior" in obj) &&
    !("intervention" in obj)
  ) {
    return raw;
  }
  const account = (obj.account ?? {}) as Record<string, unknown>;
  const perTrade = (obj.perTrade ?? {}) as Record<string, unknown>;
  const daily = (obj.daily ?? {}) as Record<string, unknown>;
  const behavior = (obj.behavior ?? {}) as Record<string, unknown>;
  const intervention = (obj.intervention ?? {}) as Record<string, unknown>;
  return {
    accountSize: account.accountSize,
    accountCurrency: account.currency,
    accountType: account.accountType,
    baseRiskPerTradePercent: account.baseRiskPerTradePercent,
    maxDollarRiskPerTrade: account.maxDollarRiskPerTrade,
    maxDailyLossPercent: daily.maxDailyLossPercent,
    // Pre-dates the dedicated `maxDailyTrades` field — let default-merge fill.
    maxRedTrades: daily.maxRedTrades,
    maxConsecutiveLosses: daily.maxConsecutiveLosses,
    cooldownAfterLossMinutes: daily.cooldownAfterLossMinutes,
    requireStopLoss: perTrade.requireStopLoss,
    minimumRewardRisk: perTrade.minRewardRiskRatio,
    maxPositionSize: perTrade.maxPositionSize,
    maxAddsPerTrade: perTrade.maxAddsPerTrade,
    maxOpenPositions: perTrade.maxOpenPositions,
    noAveragingDown: perTrade.noAveragingDown,
    setupMustBeApproved: perTrade.setupMustBeApproved,
    allowedSetups: obj.allowedSetups,
    noReentryWithinMinutes: behavior.noReentryWithinMinutes,
    noRevengeTrading: behavior.noRevengeTrading,
    noTradingAfterEmotionalWarning: behavior.noTradingAfterEmotionalWarning,
    noTradesOutsideAllowedSetups: behavior.noTradesOutsideAllowedSetups,
    noOvertrading: behavior.noOvertrading,
    warningLevel: intervention.warningLevel,
    requireConfirmationBeforeOverride:
      intervention.requireConfirmationBeforeOverride,
    reflectionPromptAfterOverride: intervention.reflectionPromptAfterOverride,
    lockoutAfterMaxLoss: daily.lockoutAfterMaxLoss,
    updatedAt: obj.lastUpdated ?? null,
  };
}
