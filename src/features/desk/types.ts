import type { LucideIcon } from "lucide-react";

import type {
  BehaviorEventTone,
  BehaviorEventType,
} from "@/lib/behavior-events";

export type MarketType = "Stocks" | "Options" | "Futures" | "Forex" | "Crypto";

export type Direction = "Long" | "Short";

export type TradeInput = {
  symbol: string;
  marketType: MarketType;
  direction: Direction;
  // Price fields are raw input strings — keeps trailing decimals during
  // typing (e.g. "99." → "99.5" → "99.50"). Parsed on demand in risk calc.
  entryPrice: string;
  stopPrice: string;
  targetPrice: string;
  positionSize: number | null;
  setupType: string;
  tradePlan: string;
};

export type UserRules = {
  accountSize: number;
  allowedSetups: string[];
  maxRiskPerTradePercent: number;
  maxDailyLossPercent: number;
  maxTradesPerDay: number;
  reentryCooldownMinutes: number;
  consecutiveLossLimit: number;
  requireTradePlan: boolean;
  requireStopLoss: boolean;
};

export type SessionState = {
  dailyLossUsedPercent: number;
  tradesTakenToday: number;
  lastTradeAt: string | null;
  cooldownActive: boolean;
  dailyLossLimitBreached: boolean;
};

export type RiskCalculation = {
  riskPerShare: number | null;
  totalTradeRisk: number | null;
  estimatedReward: number | null;
  rewardToRiskRatio: number | null;
  percentOfAccountAtRisk: number | null;
  projectedDailyRiskAfterTrade: number | null;
};

export type RuleStatus = "pass" | "warning" | "fail" | "not-checked";

export type RuleCheckResult = {
  id: string;
  label: string;
  status: RuleStatus;
  message?: string;
  recommendedAction?: string;
};

export type BehaviorEvent = {
  id: string;
  // `eventType` is the wire identifier consumed by Journal / Reports / etc.
  // Visual title/description/tone/icon are derived from the shared display
  // registry but cached on the event so feed consumers don't need to look up.
  eventType: BehaviorEventType;
  title: string;
  description: string;
  time: string;
  tone: BehaviorEventTone;
  icon: LucideIcon;
};

export type DeskMode = "manual" | "broker";
