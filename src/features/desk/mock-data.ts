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

export const MARKET_OPTIONS = [
  "Stocks",
  "Options",
  "Futures",
  "Forex",
  "Crypto",
] as const;
