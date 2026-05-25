export type LibraryStrategy = { id: string; label: string };
export type LibraryStrategyCategory = {
  id: string;
  label: string;
  strategies: LibraryStrategy[];
};

export const OPTIONS_STRATEGY_LIBRARY: LibraryStrategyCategory[] = [
  {
    id: "directional-trading",
    label: "Directional Trading",
    strategies: [
      { id: "lib-opt-calls", label: "Calls" },
      { id: "lib-opt-puts", label: "Puts" },
      { id: "lib-opt-momentum-contracts", label: "Momentum Contracts" },
      { id: "lib-opt-breakout-contracts", label: "Breakout Contracts" },
      { id: "lib-opt-reversal-contracts", label: "Reversal Contracts" },
      {
        id: "lib-opt-trend-continuation-contracts",
        label: "Trend Continuation Contracts",
      },
      { id: "lib-opt-news-catalyst", label: "News Catalyst Plays" },
      { id: "lib-opt-gap-momentum", label: "Gap Momentum Contracts" },
      { id: "lib-opt-earnings-momentum", label: "Earnings Momentum" },
      { id: "lib-opt-contract-scalping", label: "Contract Scalping" },
    ],
  },
  {
    id: "income-strategies",
    label: "Income Strategies",
    strategies: [
      { id: "lib-opt-covered-calls", label: "Covered Calls" },
      { id: "lib-opt-cash-secured-puts", label: "Cash Secured Puts" },
      { id: "lib-opt-credit-spreads", label: "Credit Spreads" },
      { id: "lib-opt-debit-spreads", label: "Debit Spreads" },
      { id: "lib-opt-iron-condors", label: "Iron Condors" },
      { id: "lib-opt-iron-butterflies", label: "Iron Butterflies" },
      { id: "lib-opt-calendars", label: "Calendars" },
      { id: "lib-opt-diagonals", label: "Diagonals" },
      { id: "lib-opt-theta-harvesting", label: "Theta Harvesting" },
      { id: "lib-opt-premium-selling", label: "Premium Selling" },
    ],
  },
  {
    id: "volatility-strategies",
    label: "Volatility Strategies",
    strategies: [
      { id: "lib-opt-straddles", label: "Straddles" },
      { id: "lib-opt-strangles", label: "Strangles" },
      { id: "lib-opt-long-vol", label: "Long Volatility" },
      { id: "lib-opt-short-vol", label: "Short Volatility" },
      { id: "lib-opt-iv-crush", label: "IV Crush Plays" },
      { id: "lib-opt-vega-expansion", label: "Vega Expansion" },
      {
        id: "lib-opt-earnings-vol",
        label: "Earnings Volatility Plays",
      },
      {
        id: "lib-opt-vol-compression-breakouts",
        label: "Volatility Compression Breakouts",
      },
    ],
  },
  {
    id: "advanced-structures",
    label: "Advanced Structures",
    strategies: [
      { id: "lib-opt-butterflies", label: "Butterflies" },
      { id: "lib-opt-broken-wing-butterflies", label: "Broken Wing Butterflies" },
      { id: "lib-opt-ratio-spreads", label: "Ratio Spreads" },
      { id: "lib-opt-backspreads", label: "Backspreads" },
      { id: "lib-opt-synthetic-longs", label: "Synthetic Longs" },
      { id: "lib-opt-synthetic-shorts", label: "Synthetic Shorts" },
      { id: "lib-opt-jade-lizards", label: "Jade Lizards" },
      { id: "lib-opt-risk-reversals", label: "Risk Reversals" },
      { id: "lib-opt-collar-hedges", label: "Collar Hedges" },
    ],
  },
  {
    id: "flow-institutional",
    label: "Flow & Institutional Setups",
    strategies: [
      { id: "lib-opt-options-flow-momentum", label: "Options Flow Momentum" },
      { id: "lib-opt-dark-pool-reaction", label: "Dark Pool Reaction" },
      { id: "lib-opt-sweep-detection", label: "Sweep Detection" },
      { id: "lib-opt-gamma-squeeze", label: "Gamma Squeeze" },
      { id: "lib-opt-dealer-hedging-move", label: "Dealer Hedging Move" },
      { id: "lib-opt-delta-expansion", label: "Delta Expansion" },
      { id: "lib-opt-contract-volume-spike", label: "Contract Volume Spike" },
    ],
  },
  {
    id: "high-risk-behavior",
    label: "High-Risk Behavior Areas",
    strategies: [
      { id: "lib-opt-averaging-down", label: "Averaging Down" },
      { id: "lib-opt-revenge-contracts", label: "Revenge Contracts" },
      { id: "lib-opt-oversizing", label: "Oversizing" },
      { id: "lib-opt-0dte-chasing", label: "0DTE Chasing" },
      { id: "lib-opt-lotto-contracts", label: "Lotto Contracts" },
      { id: "lib-opt-martingale-sizing", label: "Martingale Sizing" },
      { id: "lib-opt-emotional-reentries", label: "Emotional Re-entries" },
      { id: "lib-opt-expiration-gambling", label: "Expiration Gambling" },
      { id: "lib-opt-fomo-contracts", label: "FOMO Contracts" },
    ],
  },
];
