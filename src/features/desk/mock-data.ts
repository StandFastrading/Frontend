import {
  BEHAVIOR_EVENT_DISPLAY,
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import type {
  BehaviorEvent,
  SessionState,
  TradeInput,
  UserRules,
} from "@/features/desk/types";

export const EMPTY_TRADE_INPUT: TradeInput = {
  symbol: "",
  marketType: "Stocks",
  direction: "Long",
  entryPrice: "",
  stopPrice: "",
  targetPrice: "",
  positionSize: null,
  setupType: "",
  tradePlan: "",
};

export const MOCK_USER_RULES: UserRules = {
  accountSize: 30_000,
  allowedSetups: [
    "Opening Range Breakout",
    "VWAP Reclaim",
    "Bull Flag",
    "Pullback",
    "Breakout Continuation",
  ],
  maxRiskPerTradePercent: 1,
  maxDailyLossPercent: 4,
  maxTradesPerDay: 5,
  reentryCooldownMinutes: 15,
  consecutiveLossLimit: 3,
  requireTradePlan: true,
  requireStopLoss: true,
};

export const MOCK_SESSION_STATE: SessionState = {
  dailyLossUsedPercent: 1.32,
  tradesTakenToday: 3,
  lastTradeAt: "10:42 AM",
  cooldownActive: false,
  dailyLossLimitBreached: false,
};

// Listed explicitly (instead of spreading MOCK_USER_RULES.allowedSetups + extras)
// so the dropdown is grep-able and obviously non-empty at a glance. "Other /
// Custom" is intentionally not in allowedSetups so it triggers the warning
// branch in check-rules.
export const SETUP_OPTIONS = [
  "Opening Range Breakout",
  "VWAP Reclaim",
  "Bull Flag",
  "Pullback",
  "Breakout Continuation",
  "Other / Custom",
] as const;

export const MARKET_OPTIONS = [
  "Stocks",
  "Options",
  "Futures",
  "Forex",
  "Crypto",
] as const;

function seedEvent(
  id: string,
  eventType: BehaviorEventType,
  time: string,
): BehaviorEvent {
  const d = BEHAVIOR_EVENT_DISPLAY[eventType];
  return {
    id,
    eventType,
    time,
    title: d.displayTitle,
    description: d.displayDescription,
    tone: d.tone,
    icon: d.icon,
  };
}

export const MOCK_BEHAVIOR_EVENTS: BehaviorEvent[] = [
  seedEvent("evt-1", BEHAVIOR_EVENT_TYPES.TRADE_PLAN_STARTED, "10:38 AM"),
  seedEvent("evt-2", BEHAVIOR_EVENT_TYPES.RISK_CHECKED, "10:39 AM"),
  seedEvent("evt-3", BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED, "10:40 AM"),
  seedEvent("evt-4", BEHAVIOR_EVENT_TYPES.TRADE_REVISED, "10:41 AM"),
  seedEvent("evt-5", BEHAVIOR_EVENT_TYPES.TRADE_APPROVED, "10:42 AM"),
];
