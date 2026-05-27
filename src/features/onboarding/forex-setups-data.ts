export type LibrarySetup = { id: string; label: string };
export type LibrarySetupCategory = {
  id: string;
  label: string;
  setups: LibrarySetup[];
};

export const FOREX_SETUP_LIBRARY: LibrarySetupCategory[] = [
  {
    id: "ict-concepts",
    label: "ICT Concepts",
    setups: [
      { id: "lib-fx-order-block", label: "Order Block" },
      { id: "lib-fx-breaker-block", label: "Breaker Block" },
      { id: "lib-fx-fair-value-gap", label: "Fair Value Gap" },
      { id: "lib-fx-mss", label: "Market Structure Shift" },
      { id: "lib-fx-bos", label: "Break of Structure" },
      { id: "lib-fx-liquidity-grab", label: "Liquidity Grab" },
      { id: "lib-fx-equal-highs-lows", label: "Equal Highs / Equal Lows" },
      { id: "lib-fx-power-of-3", label: "Power of 3" },
      { id: "lib-fx-silver-bullet", label: "Silver Bullet Window" },
      { id: "lib-fx-judas-swing", label: "Judas Swing" },
    ],
  },
  {
    id: "smart-money",
    label: "Smart Money Concepts",
    setups: [
      { id: "lib-fx-supply-zone", label: "Supply Zone" },
      { id: "lib-fx-demand-zone", label: "Demand Zone" },
      { id: "lib-fx-mitigation-block", label: "Mitigation Block" },
      { id: "lib-fx-inducement", label: "Inducement" },
      { id: "lib-fx-imbalance", label: "Imbalance" },
      { id: "lib-fx-poi-retest", label: "Point of Interest Retest" },
      { id: "lib-fx-change-of-character", label: "Change of Character" },
      { id: "lib-fx-displacement", label: "Displacement" },
    ],
  },
  {
    id: "session-based",
    label: "Session-Based Setups",
    setups: [
      { id: "lib-fx-asian-range", label: "Asian Range Breakout" },
      { id: "lib-fx-london-killzone", label: "London Killzone" },
      { id: "lib-fx-ny-killzone", label: "New York Killzone" },
      { id: "lib-fx-london-reversal", label: "London Reversal" },
      { id: "lib-fx-ny-reversal", label: "New York Reversal" },
      { id: "lib-fx-session-open-trap", label: "Session Open Trap" },
      { id: "lib-fx-overlap-momentum", label: "Overlap Momentum" },
      { id: "lib-fx-rollover-fade", label: "Rollover Fade" },
    ],
  },
  {
    id: "news-volatility",
    label: "News & Volatility",
    setups: [
      { id: "lib-fx-nfp-trade", label: "NFP Trade" },
      { id: "lib-fx-cpi-trade", label: "CPI Trade" },
      { id: "lib-fx-central-bank-decision", label: "Central Bank Decision" },
      { id: "lib-fx-fomc-reaction", label: "FOMC Reaction" },
      { id: "lib-fx-ecb-reaction", label: "ECB Reaction" },
      { id: "lib-fx-news-fade", label: "News Spike Fade" },
      { id: "lib-fx-news-breakout", label: "News Breakout" },
      { id: "lib-fx-econ-data-spike", label: "Economic Data Spike" },
    ],
  },
  {
    id: "scalping-structures",
    label: "Scalping Structures",
    setups: [
      { id: "lib-fx-1m-pullback", label: "1-Min Pullback" },
      { id: "lib-fx-5m-breakout", label: "5-Min Breakout" },
      { id: "lib-fx-pip-scalp", label: "Pip Scalp" },
      { id: "lib-fx-micro-flag", label: "Micro Flag" },
      { id: "lib-fx-tick-reversal", label: "Tick Reversal" },
      { id: "lib-fx-spread-scalp", label: "Spread Scalp" },
      { id: "lib-fx-news-scalp", label: "News Scalp" },
    ],
  },
  {
    id: "advanced-forex",
    label: "Advanced Forex Concepts",
    setups: [
      { id: "lib-fx-carry-trade", label: "Carry Trade" },
      { id: "lib-fx-correlation-trade", label: "Correlation Trade" },
      { id: "lib-fx-divergence-trade", label: "Divergence Trade" },
      { id: "lib-fx-dxy-correlation", label: "DXY Correlation" },
      { id: "lib-fx-cot-positioning", label: "COT Positioning" },
      { id: "lib-fx-cross-pair-hedge", label: "Cross-Pair Hedge" },
      { id: "lib-fx-interest-rate-spread", label: "Interest Rate Spread" },
      { id: "lib-fx-risk-on-off", label: "Risk-On / Risk-Off Rotation" },
    ],
  },
];
