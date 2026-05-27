export type LibrarySetup = { id: string; label: string };
export type LibrarySetupCategory = {
  id: string;
  label: string;
  setups: LibrarySetup[];
};

export const FUTURES_SETUP_LIBRARY: LibrarySetupCategory[] = [
  {
    id: "order-flow",
    label: "Order Flow",
    setups: [
      { id: "lib-fut-bid-ask-imbalance", label: "Bid/Ask Imbalance" },
      { id: "lib-fut-delta-divergence", label: "Delta Divergence" },
      { id: "lib-fut-cumulative-delta", label: "Cumulative Delta" },
      { id: "lib-fut-iceberg-detection", label: "Iceberg Detection" },
      { id: "lib-fut-aggressive-buyer", label: "Aggressive Buyer Tape" },
      { id: "lib-fut-aggressive-seller", label: "Aggressive Seller Tape" },
      { id: "lib-fut-absorption-flip", label: "Absorption Flip" },
      { id: "lib-fut-trapped-longs", label: "Trapped Longs" },
      { id: "lib-fut-trapped-shorts", label: "Trapped Shorts" },
    ],
  },
  {
    id: "auction-market-theory",
    label: "Auction Market Theory",
    setups: [
      { id: "lib-fut-poc-reaction", label: "POC Reaction" },
      { id: "lib-fut-value-area-rotation", label: "Value Area Rotation" },
      { id: "lib-fut-value-area-extension", label: "Value Area Extension" },
      { id: "lib-fut-balance-breakout", label: "Balance Breakout" },
      { id: "lib-fut-imbalance-fill", label: "Imbalance Fill" },
      { id: "lib-fut-overnight-inventory", label: "Overnight Inventory Adjust" },
      { id: "lib-fut-open-drive", label: "Open Drive" },
      { id: "lib-fut-open-test-drive", label: "Open Test Drive" },
      { id: "lib-fut-open-rejection-reverse", label: "Open Rejection Reverse" },
      { id: "lib-fut-trend-day", label: "Trend Day Auction" },
    ],
  },
  {
    id: "ict-liquidity",
    label: "ICT / Liquidity Concepts",
    setups: [
      { id: "lib-fut-liquidity-grab", label: "Liquidity Grab" },
      { id: "lib-fut-order-block", label: "Order Block" },
      { id: "lib-fut-breaker-block", label: "Breaker Block" },
      { id: "lib-fut-fair-value-gap", label: "Fair Value Gap" },
      { id: "lib-fut-equal-highs-lows", label: "Equal Highs / Equal Lows" },
      { id: "lib-fut-stop-hunt", label: "Stop Hunt" },
      { id: "lib-fut-mss", label: "Market Structure Shift" },
      { id: "lib-fut-bos", label: "Break of Structure" },
      { id: "lib-fut-power-of-3", label: "Power of 3" },
      { id: "lib-fut-silver-bullet", label: "Silver Bullet Window" },
    ],
  },
  {
    id: "news-volatility",
    label: "News & Volatility",
    setups: [
      { id: "lib-fut-fomc-reaction", label: "FOMC Reaction" },
      { id: "lib-fut-cpi-trade", label: "CPI Trade" },
      { id: "lib-fut-nfp-trade", label: "NFP Trade" },
      { id: "lib-fut-econ-data-spike", label: "Economic Data Spike" },
      { id: "lib-fut-breaking-news-momentum", label: "Breaking News Momentum" },
      { id: "lib-fut-rate-decision-fade", label: "Rate Decision Fade" },
      { id: "lib-fut-inventory-spike", label: "Inventory Report Spike" },
      { id: "lib-fut-vix-expansion", label: "VIX Expansion Play" },
    ],
  },
  {
    id: "micro-scalping",
    label: "Micro Scalping",
    setups: [
      { id: "lib-fut-tick-scalp", label: "Tick Scalp" },
      { id: "lib-fut-1m-pullback", label: "1-Min Pullback" },
      { id: "lib-fut-1m-breakout", label: "1-Min Breakout" },
      { id: "lib-fut-vwap-scalp", label: "VWAP Scalp" },
      { id: "lib-fut-orb-scalp", label: "ORB Scalp" },
      { id: "lib-fut-micro-flag", label: "Micro Flag" },
      { id: "lib-fut-micro-trap", label: "Micro Trap" },
      { id: "lib-fut-ladder-scalp", label: "Ladder Scalp" },
    ],
  },
  {
    id: "advanced-futures-structures",
    label: "Advanced Futures Structures",
    setups: [
      { id: "lib-fut-spread-trade", label: "Spread Trade" },
      { id: "lib-fut-calendar-spread", label: "Calendar Spread" },
      { id: "lib-fut-inter-product-spread", label: "Inter-Product Spread" },
      { id: "lib-fut-pairs-trade", label: "Pairs Trade" },
      { id: "lib-fut-roll-yield", label: "Roll Yield Play" },
      { id: "lib-fut-basis-trade", label: "Basis Trade" },
      { id: "lib-fut-curve-steepener", label: "Curve Steepener" },
      { id: "lib-fut-curve-flattener", label: "Curve Flattener" },
    ],
  },
];
