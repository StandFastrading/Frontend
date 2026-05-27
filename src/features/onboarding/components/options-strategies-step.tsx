"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownUp,
  ArrowDownToLine,
  ArrowUpToLine,
  Banknote,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Diamond,
  DollarSign,
  Flag,
  Flame,
  GitBranch,
  Layers,
  Lightbulb,
  Newspaper,
  Plus,
  RefreshCw,
  ShieldAlert,
  Target,
  Ticket,
  TrendingUp,
  Triangle,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { OptionsStrategyLibrary } from "./options-strategy-library";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Strategy = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DIRECTIONAL: Strategy[] = [
  { id: "calls", label: "Calls", description: "Bullish directional contracts.", icon: ArrowUpToLine },
  { id: "puts", label: "Puts", description: "Bearish directional contracts.", icon: ArrowDownToLine },
  { id: "momentum", label: "Momentum Contracts", description: "Riding strong, fast moves.", icon: Zap },
  { id: "breakout", label: "Breakout Contracts", description: "Buying breaks of key levels.", icon: Flag },
  { id: "reversal", label: "Reversal Contracts", description: "Fading exhausted moves.", icon: RefreshCw },
  { id: "news-catalyst", label: "News Catalyst Plays", description: "Earnings, FDA, macro events.", icon: Newspaper },
];

const INCOME: Strategy[] = [
  { id: "covered-calls", label: "Covered Calls", description: "Selling calls against long stock.", icon: Banknote },
  { id: "cash-secured-puts", label: "Cash Secured Puts", description: "Selling puts with cash collateral.", icon: DollarSign },
  { id: "credit-spreads", label: "Credit Spreads", description: "Defined-risk premium selling.", icon: GitBranch },
  { id: "iron-condors", label: "Iron Condors", description: "Range-bound premium collection.", icon: Diamond },
];

const ADVANCED: Strategy[] = [
  { id: "debit-spreads", label: "Debit Spreads", description: "Defined-risk directional plays.", icon: GitBranch },
  { id: "butterflies", label: "Butterflies", description: "Narrow-range pin plays.", icon: Triangle },
  { id: "calendars", label: "Calendars", description: "Time-spread structures.", icon: CalendarClock },
  { id: "straddles", label: "Straddles", description: "Long volatility, ATM strikes.", icon: ArrowDownUp },
  { id: "strangles", label: "Strangles", description: "Long volatility, OTM strikes.", icon: Layers },
];

const HIGH_RISK: Strategy[] = [
  { id: "averaging-down", label: "Averaging Down", description: "Adding to losing contracts.", icon: ArrowDownUp },
  { id: "revenge-contracts", label: "Revenge Contracts", description: "Trading to recover losses.", icon: ShieldAlert },
  { id: "overleveraging", label: "Overleveraging", description: "Position size beyond plan.", icon: Flame },
  { id: "0dte-chasing", label: "0DTE Chasing", description: "Same-day expiration FOMO.", icon: Target },
  { id: "lotto-contracts", label: "Lotto Contracts", description: "Far OTM, low-prob bets.", icon: Ticket },
];

type CustomStrategy = { id: string; label: string };

export function OptionsStrategiesStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(
    [],
  );
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
    setCustomStrategies((prev) => [...prev, { id, label: trimmed }]);
    setSelected((prev) => new Set(prev).add(id));
  }

  function handleContinue() {
    console.log("[onboarding] options.strategies", {
      selected: Array.from(selected),
      customStrategies,
    });
    router.push("/onboarding/options/behavioral");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 4 of 6
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your strategies &amp; setups
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Select the setups and strategies you actually use. These become your
          journal tags and the foundation for your behavioral analytics.
        </p>
      </div>

      <StrategyGroup
        groupIcon={TrendingUp}
        title="Directional Trading"
        strategies={DIRECTIONAL}
        selected={selected}
        onToggle={toggle}
      />
      <StrategyGroup
        groupIcon={Banknote}
        title="Income Strategies"
        strategies={INCOME}
        selected={selected}
        onToggle={toggle}
      />
      <StrategyGroup
        groupIcon={Layers}
        title="Advanced Structures"
        strategies={ADVANCED}
        selected={selected}
        onToggle={toggle}
      />
      <StrategyGroup
        groupIcon={ShieldAlert}
        title="High-Risk Behavior Areas"
        strategies={HIGH_RISK}
        selected={selected}
        onToggle={toggle}
        accent="risk"
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
              MORE STRATEGIES
            </p>
            <p className="hidden text-xs text-slate-300 sm:block">
              Search across your strategies or create a custom one.
            </p>
          </div>
          {moreOpen ? (
            <ChevronUp className="size-4 text-cyan-300" />
          ) : (
            <ChevronDown className="size-4 text-cyan-300" />
          )}
        </button>

        {moreOpen && (
          <OptionsStrategyLibrary
            selected={selected}
            onToggle={toggle}
            search={search}
            onSearch={setSearch}
            customStrategies={customStrategies}
            onAddCustomStrategy={addCustomFromLibrary}
          />
        )}
      </section>

      <Callout
        icon={Lightbulb}
        title="These tags power your edge."
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

function StrategyGroup({
  groupIcon: GroupIcon,
  title,
  strategies,
  selected,
  onToggle,
  accent = "neutral",
}: {
  groupIcon: React.ComponentType<{ className?: string }>;
  title: string;
  strategies: Strategy[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accent?: "neutral" | "risk";
}) {
  const isRisk = accent === "risk";
  return (
    <section
      className={cn(
        "rounded-2xl border p-5",
        isRisk
          ? "border-rose-400/20 bg-rose-400/[0.03]"
          : "border-white/[0.08] bg-[#0a1122]/70",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <GroupIcon
          className={cn(
            "size-5",
            isRisk ? "text-rose-300" : "text-cyan-300",
          )}
        />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {isRisk && (
          <span className="ml-1 rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
            Behavior signals
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {strategies.map((s) => {
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

