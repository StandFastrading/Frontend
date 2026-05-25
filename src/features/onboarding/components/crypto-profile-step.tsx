"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Check,
  Clock,
  Compass,
  Gauge,
  Infinity as InfinityIcon,
  LineChart,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Option = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TRADER_TYPES: Option[] = [
  {
    id: "scalper",
    label: "Scalper",
    description: "Seconds to minutes per trade.",
    icon: Gauge,
  },
  {
    id: "day-trader",
    label: "Day Trader",
    description: "Flat by end of session.",
    icon: Clock,
  },
  {
    id: "swing-trader",
    label: "Swing Trader",
    description: "Hold positions over days to weeks.",
    icon: TrendingUp,
  },
  {
    id: "position-trader",
    label: "Position Trader",
    description: "Long-term macro and narrative plays.",
    icon: Compass,
  },
  {
    id: "momentum-trader",
    label: "Momentum Trader",
    description: "Chase strength, fade weakness.",
    icon: Zap,
  },
];

const MAJORS = [
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
  { id: "sol", label: "SOL" },
  { id: "xrp", label: "XRP" },
  { id: "bnb", label: "BNB" },
];

const MID_CAPS = [
  { id: "avax", label: "AVAX" },
  { id: "link", label: "LINK" },
  { id: "ada", label: "ADA" },
  { id: "doge", label: "DOGE" },
  { id: "matic", label: "MATIC" },
];

const HIGH_VOL = [
  { id: "memes", label: "Meme Coins" },
  { id: "low-caps", label: "Low Caps" },
  { id: "ai-tokens", label: "AI Tokens" },
  { id: "defi-tokens", label: "DeFi Tokens" },
  { id: "new-listings", label: "New Listings" },
];

const MARKETS: Option[] = [
  { id: "spot", label: "Spot", description: "Own the underlying asset.", icon: Wallet },
  { id: "futures", label: "Futures", description: "Standard expirations.", icon: LineChart },
  { id: "perpetuals", label: "Perpetuals", description: "No expiry, funding rates.", icon: InfinityIcon },
  { id: "leverage", label: "Leverage Trading", description: "Margin / cross / isolated.", icon: TrendingUp },
  { id: "options", label: "Options", description: "Calls, puts, structures.", icon: Sparkles },
];

const TIMEFRAMES = [
  { id: "scalping", label: "Scalping (1m–5m)" },
  { id: "intraday", label: "Intraday" },
  { id: "swing", label: "Swing" },
  { id: "multi-day", label: "Multi-Day" },
  { id: "long-term", label: "Long-Term" },
];

export function CryptoProfileStep() {
  const router = useRouter();
  const [traderType, setTraderType] = useState<string | null>(null);
  const [assets, setAssets] = useState<Set<string>>(new Set());
  const [market, setMarket] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>(null);

  const valid =
    traderType !== null &&
    assets.size > 0 &&
    market !== null &&
    timeframe !== null;

  function toggleAsset(id: string) {
    setAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    console.log("[onboarding] crypto.profile", {
      traderType,
      assets: Array.from(assets),
      market,
      timeframe,
    });
    router.push("/onboarding/crypto/setups");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 3 of 7
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your crypto trading profile
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Tell us how you typically trade crypto markets.
        </p>
      </div>

      <NumberedSection
        num={1}
        title="What type of crypto trader are you?"
        subtitle="Pick the style that fits most days."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {TRADER_TYPES.map((t) => {
            const Icon = t.icon;
            const selected = traderType === t.id;
            return (
              <PickCard
                key={t.id}
                variant="single"
                selected={selected}
                onClick={() => setTraderType(t.id)}
                className="flex-col items-start gap-2 p-3.5 pr-9"
              >
                <Icon
                  className={cn(
                    "size-6 transition-all duration-300",
                    selected
                      ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                      : "text-lime-400/85",
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-white">{t.label}</p>
                  <p className="text-[11px] leading-snug text-slate-300">
                    {t.description}
                  </p>
                </div>
              </PickCard>
            );
          })}
        </div>
      </NumberedSection>

      <NumberedSection
        num={2}
        title="What assets do you primarily trade?"
        subtitle="Select all that apply."
      >
        <div className="flex flex-col gap-4">
          <AssetGroup
            label="Majors"
            assets={MAJORS}
            selected={assets}
            onToggle={toggleAsset}
          />
          <AssetGroup
            label="Mid-Caps"
            assets={MID_CAPS}
            selected={assets}
            onToggle={toggleAsset}
          />
          <AssetGroup
            label="High Volatility"
            assets={HIGH_VOL}
            selected={assets}
            onToggle={toggleAsset}
            warning
          />
        </div>
      </NumberedSection>

      <NumberedSection
        num={3}
        title="What markets do you trade?"
        subtitle="The one you're most active in."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {MARKETS.map((m) => {
            const Icon = m.icon;
            const selected = market === m.id;
            return (
              <PickCard
                key={m.id}
                variant="single"
                selected={selected}
                onClick={() => setMarket(m.id)}
                className="flex-col items-start gap-2 p-3.5 pr-9"
              >
                <Icon
                  className={cn(
                    "size-6 transition-all duration-300",
                    selected
                      ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                      : "text-lime-400/85",
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-white">{m.label}</p>
                  <p className="text-[11px] leading-snug text-slate-300">
                    {m.description}
                  </p>
                </div>
              </PickCard>
            );
          })}
        </div>
      </NumberedSection>

      <NumberedSection
        num={4}
        title="What timeframe do you trade most?"
        subtitle="The one your entries usually live on."
      >
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((t) => {
            const selected = timeframe === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200",
                  selected
                    ? "border-cyan-400/70 bg-cyan-400/[0.10] text-white shadow-[0_0_15px_-3px_rgba(34,211,238,0.45)]"
                    : "border-white/[0.08] bg-[#0c1428]/80 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] hover:text-white",
                )}
              >
                <Sun
                  className={cn(
                    "size-3.5",
                    selected ? "text-lime-400" : "text-lime-400/85",
                  )}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </NumberedSection>

      <StepFooter
        currentNum={3}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function NumberedSection({
  num,
  title,
  subtitle,
  children,
}: {
  num: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5 lg:grid-cols-[1fr_2.6fr] lg:items-start lg:gap-6">
      <div className="flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 text-xs font-semibold text-cyan-300">
          {num}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold leading-snug text-white">
            {title}
          </h2>
          <p className="text-xs leading-snug text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function AssetGroup({
  label,
  assets,
  selected,
  onToggle,
  warning = false,
}: {
  label: string;
  assets: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  warning?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em]",
            warning ? "text-rose-300" : "text-slate-400",
          )}
        >
          {label}
        </p>
        {warning && (
          <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
            Higher volatility · stricter protections
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {assets.map((a) => {
          const isSelected = selected.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggle(a.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all duration-200",
                isSelected
                  ? "border-lime-400/70 bg-lime-400/[0.10] text-white shadow-[0_0_12px_-3px_rgba(163,230,53,0.45)]"
                  : "border-white/[0.08] bg-[#0c1428]/80 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.05] hover:text-white",
              )}
            >
              {isSelected && (
                <Check className="size-3 stroke-[3] text-lime-400" />
              )}
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

