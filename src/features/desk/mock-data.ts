import type { TradeInput } from "@/features/desk/types";

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

// Listed explicitly so the dropdown is grep-able and obviously non-empty at a
// glance. "Other / Custom" is intentionally not in the default allowedSetups
// list so it triggers the warning branch in the validation engine.
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
