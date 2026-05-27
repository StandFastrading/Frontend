"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowDownUp,
  CandlestickChart,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flag,
  Layers,
  Lightbulb,
  LineChart,
  Plus,
  RefreshCw,
  Repeat,
  SunMedium,
  Target,
  TrendingDown,
  TrendingUp,
  Undo2,
  Waves,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import {
  FuturesSetupLibrary,
  type CustomSetup,
} from "./futures-setup-library";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Setup = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRICE_ACTION: Setup[] = [
  { id: "breakout", label: "Breakout", description: "Price breaks key levels with momentum.", icon: Flag },
  { id: "pullback", label: "Pullback / Retest", description: "Retest of a broken level.", icon: Undo2 },
  { id: "reversal", label: "Reversal", description: "Direction flip at a key level.", icon: ArrowDownUp },
  { id: "trend-continuation", label: "Trend Continuation", description: "Riding the dominant direction.", icon: TrendingUp },
  { id: "range-break", label: "Range Break", description: "Exit from balance into trend.", icon: Crosshair },
];

const LIQUIDITY: Setup[] = [
  { id: "liquidity-sweep", label: "Liquidity Sweep", description: "Stop hunt before continuation.", icon: Waves },
  { id: "stop-run", label: "Stop Run", description: "Tag of obvious stop pools.", icon: Target },
  { id: "vwap-reclaim", label: "VWAP Reclaim", description: "Price reclaims the session anchor.", icon: LineChart },
  { id: "delta-shift", label: "Delta Shift", description: "Order-flow direction change.", icon: Activity },
  { id: "absorption", label: "Absorption", description: "Aggression met by passive flow.", icon: Layers },
  { id: "failed-breakdown", label: "Failed Breakdown", description: "Bearish break that reclaims.", icon: TrendingUp },
  { id: "failed-breakout", label: "Failed Breakout", description: "Bullish break that fails.", icon: TrendingDown },
];

const TREND_MOMENTUM: Setup[] = [
  { id: "opening-drive", label: "Opening Drive", description: "Strong direction off the open.", icon: SunMedium },
  { id: "trend-day-continuation", label: "Trend Day Continuation", description: "Riding a one-direction session.", icon: TrendingUp },
  { id: "momentum-expansion", label: "Momentum Expansion", description: "Range and pace both expand.", icon: Zap },
  { id: "ema-pullback", label: "EMA Pullback", description: "Pullback to a moving average.", icon: Undo2 },
  { id: "orb", label: "Opening Range Breakout (ORB)", description: "Break of the open range.", icon: Flag },
];

const MEAN_REVERSION: Setup[] = [
  { id: "mean-reversion", label: "Mean Reversion", description: "Back to the average.", icon: RefreshCw },
  { id: "gap-fill", label: "Gap Fill", description: "Price returns to fill a gap.", icon: Repeat },
  { id: "exhaustion-reversal", label: "Exhaustion Reversal", description: "Final push gets faded.", icon: ArrowDownUp },
  { id: "vwap-fade", label: "VWAP Fade", description: "Fade an extension from VWAP.", icon: LineChart },
  { id: "parabolic-reversal", label: "Parabolic Reversal", description: "Climax move flips.", icon: TrendingDown },
];

export function FuturesSetupsStep() {
  const router = useRouter();
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
    console.log("[onboarding] futures.setups", {
      selected: Array.from(selected),
      customSetups,
    });
    router.push("/onboarding/futures/behavioral");
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
        groupIcon={CandlestickChart}
        title="Price Action"
        setups={PRICE_ACTION}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={Waves}
        title="Liquidity & Order Flow"
        setups={LIQUIDITY}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={TrendingUp}
        title="Trend & Momentum"
        setups={TREND_MOMENTUM}
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
          <FuturesSetupLibrary
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

