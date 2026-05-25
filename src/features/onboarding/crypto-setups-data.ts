export type LibrarySetup = { id: string; label: string };
export type LibrarySetupCategory = {
  id: string;
  label: string;
  setups: LibrarySetup[];
};

export const CRYPTO_SETUP_LIBRARY: LibrarySetupCategory[] = [
  {
    id: "smart-money",
    label: "Smart Money Concepts",
    setups: [
      { id: "lib-cr-supply-zone", label: "Supply Zone" },
      { id: "lib-cr-demand-zone", label: "Demand Zone" },
      { id: "lib-cr-mitigation-block", label: "Mitigation Block" },
      { id: "lib-cr-inducement", label: "Inducement" },
      { id: "lib-cr-imbalance", label: "Imbalance" },
      { id: "lib-cr-poi-retest", label: "Point of Interest Retest" },
      { id: "lib-cr-change-of-character", label: "Change of Character" },
      { id: "lib-cr-displacement", label: "Displacement" },
    ],
  },
  {
    id: "ict-concepts",
    label: "ICT Concepts",
    setups: [
      { id: "lib-cr-order-block", label: "Order Block" },
      { id: "lib-cr-breaker-block", label: "Breaker Block" },
      { id: "lib-cr-fair-value-gap", label: "Fair Value Gap" },
      { id: "lib-cr-mss", label: "Market Structure Shift" },
      { id: "lib-cr-bos", label: "Break of Structure" },
      { id: "lib-cr-liquidity-grab", label: "Liquidity Grab" },
      { id: "lib-cr-equal-highs-lows", label: "Equal Highs / Equal Lows" },
      { id: "lib-cr-judas-swing", label: "Judas Swing" },
      { id: "lib-cr-killzone", label: "Killzone Window" },
    ],
  },
  {
    id: "defi-momentum",
    label: "DeFi Momentum",
    setups: [
      { id: "lib-cr-tvl-spike", label: "TVL Spike Play" },
      { id: "lib-cr-protocol-launch", label: "Protocol Launch Momentum" },
      { id: "lib-cr-token-unlock", label: "Token Unlock Fade" },
      { id: "lib-cr-governance-vote", label: "Governance Vote Catalyst" },
      { id: "lib-cr-airdrop-front-run", label: "Airdrop Front-Run" },
      { id: "lib-cr-fork-arbitrage", label: "Fork Arbitrage" },
      { id: "lib-cr-yield-rotation", label: "Yield Rotation" },
      { id: "lib-cr-liquidity-migration", label: "Liquidity Migration" },
    ],
  },
  {
    id: "scalping-structures",
    label: "Scalping Structures",
    setups: [
      { id: "lib-cr-1m-pullback", label: "1-Min Pullback" },
      { id: "lib-cr-5m-breakout", label: "5-Min Breakout" },
      { id: "lib-cr-tick-scalp", label: "Tick Scalp" },
      { id: "lib-cr-micro-flag", label: "Micro Flag" },
      { id: "lib-cr-micro-trap", label: "Micro Trap" },
      { id: "lib-cr-ladder-scalp", label: "Ladder Scalp" },
      { id: "lib-cr-funding-flip", label: "Funding Flip Scalp" },
      { id: "lib-cr-wick-fade", label: "Wick Fade" },
    ],
  },
  {
    id: "volatility-expansion",
    label: "Volatility Expansion",
    setups: [
      { id: "lib-cr-bollinger-squeeze", label: "Bollinger Squeeze" },
      { id: "lib-cr-vol-compression", label: "Vol Compression Break" },
      { id: "lib-cr-asia-range-break", label: "Asia Range Break" },
      { id: "lib-cr-weekend-gap", label: "Weekend Gap Play" },
      { id: "lib-cr-news-spike", label: "News Spike Expansion" },
      { id: "lib-cr-liquidation-cascade", label: "Liquidation Cascade" },
      { id: "lib-cr-funding-rate-flip", label: "Funding Rate Flip" },
    ],
  },
  {
    id: "advanced-crypto",
    label: "Advanced Crypto Concepts",
    setups: [
      { id: "lib-cr-basis-trade", label: "Basis Trade" },
      { id: "lib-cr-perp-spot-arb", label: "Perp / Spot Arbitrage" },
      { id: "lib-cr-cross-exchange-arb", label: "Cross-Exchange Arb" },
      { id: "lib-cr-btc-dom-rotation", label: "BTC Dominance Rotation" },
      { id: "lib-cr-eth-btc-spread", label: "ETH/BTC Spread" },
      { id: "lib-cr-cme-gap-fill", label: "CME Gap Fill" },
      { id: "lib-cr-options-skew", label: "Options Skew Play" },
      { id: "lib-cr-onchain-flow", label: "On-Chain Flow Reaction" },
      { id: "lib-cr-whale-wallet", label: "Whale Wallet Reaction" },
    ],
  },
];
