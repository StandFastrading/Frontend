"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowUp,
  Bitcoin,
  ChevronDown,
  ChevronUp,
  Flag,
  Flame,
  Lightbulb,
  LineChart,
  MessageCircle,
  Plus,
  RefreshCw,
  Repeat,
  Rocket,
  Target,
  TrendingDown,
  TrendingUp,
  Undo2,
  Waves,
  Zap,
  Zap as ZapAlt,
} from "lucide-react";

import { CRYPTO_SETUP_LIBRARY } from "@/features/onboarding/crypto-setups-data";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Callout } from "./callout";
import {
  CryptoSetupLibrary,
  type CustomSetup,
} from "./crypto-setup-library";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Setup = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MOMENTUM_BREAKOUTS: Setup[] = [
  { id: "momentum-breakout", label: "Momentum Breakout", description: "Strong break of key resistance.", icon: Zap },
  { id: "range-breakout", label: "Range Breakout", description: "Break of a sideways base.", icon: Flag },
  { id: "volume-expansion", label: "Volume Expansion", description: "Volume surge confirms direction.", icon: Activity },
  { id: "trend-continuation", label: "Trend Continuation", description: "Riding the dominant direction.", icon: TrendingUp },
  { id: "breakout-retest", label: "Breakout Retest", description: "Reclaim of a broken level.", icon: Undo2 },
];

const LIQUIDITY: Setup[] = [
  { id: "liquidity-sweep", label: "Liquidity Sweep", description: "Stop hunt before continuation.", icon: Waves },
  { id: "stop-hunt", label: "Stop Hunt", description: "Tag of obvious stop pools.", icon: Target },
  { id: "bos", label: "Break of Structure", description: "New high/low confirms direction.", icon: TrendingUp },
  { id: "mss", label: "Market Structure Shift", description: "Trend bias flips.", icon: ArrowDownUp },
  { id: "failed-breakdown", label: "Failed Breakdown", description: "Bearish break that reclaims.", icon: TrendingUp },
  { id: "failed-breakout", label: "Failed Breakout", description: "Bullish break that fails.", icon: TrendingDown },
];

const MEAN_REVERSION: Setup[] = [
  { id: "mean-reversion", label: "Mean Reversion", description: "Back to the average.", icon: RefreshCw },
  { id: "oversold-bounce", label: "Oversold Bounce", description: "Bounce off extreme RSI.", icon: ArrowUp },
  { id: "exhaustion-reversal", label: "Exhaustion Reversal", description: "Final push gets faded.", icon: ArrowDownUp },
  { id: "vwap-reclaim", label: "VWAP Reclaim", description: "Price reclaims session anchor.", icon: LineChart },
  { id: "gap-fill", label: "Gap Fill", description: "Price returns to fill a gap.", icon: Repeat },
];

const CRYPTO_SPECIFIC: Setup[] = [
  { id: "funding-rate-fade", label: "Funding Rate Fade", description: "Fade lopsided positioning.", icon: Activity },
  { id: "meme-coin-momentum", label: "Meme Coin Momentum", description: "Riding viral attention.", icon: Rocket },
  { id: "low-float-rotation", label: "Low Float Rotation", description: "Capital chasing thin floats.", icon: Flame },
  { id: "social-sentiment-spike", label: "Social Sentiment Spike", description: "Twitter / Discord ignition.", icon: MessageCircle },
  { id: "exchange-listing", label: "Exchange Listing Momentum", description: "Tier-1 listing reaction.", icon: ZapAlt },
  { id: "liquidation-cascade", label: "Liquidation Cascade", description: "Forced selling chain reaction.", icon: TrendingDown },
  { id: "btc-correlation", label: "BTC Correlation Play", description: "Alts moving with BTC dominance.", icon: Bitcoin },
];

export function CryptoSetupsStep() {
  const router = useRouter();
  const riskRules = useAppStore((s) => s.riskRules);
  const saveRiskRules = useAppStore((s) => s.saveRiskRules);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  const valid = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomFromLibrary(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomSetups((prev) => [...prev, { id, label: trimmed }]);
    setSelected((prev) => new Set(prev).add(id));
  }

  function handleContinue() {
    // Persist selected setups into riskRules.allowedSetups so the Trade Desk
    // validation engine has something to match against. See setups-step.tsx
    // for the rationale — without this write, every crypto trade flags
    // as "Setup not in approved list".
    const idToLabel = new Map<string, string>();
    for (const s of [
      ...MOMENTUM_BREAKOUTS,
      ...LIQUIDITY,
      ...MEAN_REVERSION,
      ...CRYPTO_SPECIFIC,
    ]) {
      idToLabel.set(s.id, s.label);
    }
    for (const cat of CRYPTO_SETUP_LIBRARY) {
      for (const s of cat.setups) idToLabel.set(s.id, s.label);
    }
    for (const s of customSetups) idToLabel.set(s.id, s.label);

    const selectedLabels = Array.from(selected)
      .map((id) => idToLabel.get(id))
      .filter((label): label is string => Boolean(label));
    // Merge (not replace) — see setups-step.tsx for rationale.
    const allowedSetups = Array.from(
      new Set([...riskRules.allowedSetups, ...selectedLabels]),
    );

    saveRiskRules({ ...riskRules, allowedSetups });
    router.push("/onboarding/crypto/behavioral");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 4 of 7
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your strategies &amp; setups
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          These become the foundation for your behavioral analytics and
          intervention system.
        </p>
      </div>

      <SetupGroup
        groupIcon={Zap}
        title="Momentum & Breakouts"
        setups={MOMENTUM_BREAKOUTS}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={Waves}
        title="Liquidity & Structure"
        setups={LIQUIDITY}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={RefreshCw}
        title="Mean Reversion"
        setups={MEAN_REVERSION}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={Bitcoin}
        title="Crypto Specific"
        setups={CRYPTO_SPECIFIC}
        selected={selected}
        onToggle={toggle}
      />

      <section className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.03]">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-cyan-400/[0.05]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/[0.15] text-cyan-300">
              <Plus className="size-4" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-cyan-300">
              MORE SETUPS
            </p>
            <p className="hidden text-xs text-slate-300 sm:block">
              Search the full library or create your own custom setup.
            </p>
          </div>
          {moreOpen ? (
            <ChevronUp className="size-4 text-cyan-300" />
          ) : (
            <ChevronDown className="size-4 text-cyan-300" />
          )}
        </button>

        {moreOpen && (
          <CryptoSetupLibrary
            selected={selected}
            onToggle={toggle}
            search={search}
            onSearch={setSearch}
            customSetups={customSetups}
            onAddCustomSetup={addCustomFromLibrary}
          />
        )}
      </section>

      <Callout
        icon={Lightbulb}
        title="Your setups power your edge."
        text="Every selection here becomes a journal tag and a signal StandFast watches for to deliver the right intervention at the right time."
      />

      <StepFooter
        currentNum={4}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function SetupGroup({
  groupIcon: GroupIcon,
  title,
  setups,
  selected,
  onToggle,
}: {
  groupIcon: React.ComponentType<{ className?: string }>;
  title: string;
  setups: Setup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <GroupIcon className="size-5 text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {setups.map((s) => {
          const Icon = s.icon;
          const isSelected = selected.has(s.id);
          return (
            <PickCard
              key={s.id}
              variant="multi"
              selected={isSelected}
              onClick={() => onToggle(s.id)}
              className="flex-col items-start gap-2 p-3.5 pr-9"
            >
              <Icon
                className={cn(
                  "size-6 transition-all duration-300",
                  isSelected
                    ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                    : "text-lime-400/85",
                )}
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-white">{s.label}</p>
                <p className="text-[11px] leading-snug text-slate-300">
                  {s.description}
                </p>
              </div>
            </PickCard>
          );
        })}
      </div>
    </section>
  );
}
