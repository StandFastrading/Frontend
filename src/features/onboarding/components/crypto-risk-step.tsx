"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Coffee,
  Info,
  Lock,
  Minus,
  Plus,
  Rocket,
  ShieldOff,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { StepFooter } from "./step-footer";

type Rule = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SPECIAL_RULES: Rule[] = [
  {
    id: "no-revenge-after-losses",
    label: "No revenge trades after losses",
    description: "Block re-entries in the cool-off window.",
    icon: Swords,
  },
  {
    id: "no-leverage-after-red",
    label: "No leverage after red days",
    description: "Trade spot-only after a losing session.",
    icon: Zap,
  },
  {
    id: "no-memes-after-losses",
    label: "No meme coins after losses",
    description: "Stay out of high-vol speculation when tilted.",
    icon: Rocket,
  },
  {
    id: "no-averaging-losers",
    label: "No averaging losers",
    description: "Stop sizing up into losing positions.",
    icon: ArrowDownUp,
  },
  {
    id: "auto-cooldown",
    label: "Auto cooldown after max loss",
    description: "Force a break when the daily limit hits.",
    icon: Coffee,
  },
  {
    id: "lock-after-daily-loss",
    label: "Lock trading after daily loss limit",
    description: "Hard stop. Tomorrow is another day.",
    icon: Lock,
  },
];

const DEFAULT_RULES = new Set([
  "no-revenge-after-losses",
  "no-leverage-after-red",
  "auto-cooldown",
  "lock-after-daily-loss",
]);

export function CryptoRiskStep() {
  const router = useRouter();

  const [riskPerTrade, setRiskPerTrade] = useState(1.0);
  const [dailyLoss, setDailyLoss] = useState(3.0);
  const [maxLeverage, setMaxLeverage] = useState(5);
  const [maxOpenPositions, setMaxOpenPositions] = useState(3);
  const [maxCorrelatedExposure, setMaxCorrelatedExposure] = useState(2);
  const [weeklyDrawdown, setWeeklyDrawdown] = useState(8.0);
  const [maxReentries, setMaxReentries] = useState(1);
  const [rules, setRules] = useState<Set<string>>(DEFAULT_RULES);

  function toggleRule(id: string) {
    setRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    console.log("[onboarding] crypto.risk", {
      riskPerTrade,
      dailyLoss,
      maxLeverage,
      maxOpenPositions,
      maxCorrelatedExposure,
      weeklyDrawdown,
      maxReentries,
      rules: Array.from(rules),
    });
    router.push("/onboarding/crypto/platform");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 6 of 7
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Risk framework
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Define the boundaries that protect your capital.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Max account risk per trade"
          subtitle="Percent of account at risk on a single position."
        >
          <NumberStepper
            value={riskPerTrade}
            onChange={setRiskPerTrade}
            min={0.25}
            max={5}
            step={0.25}
            format={(v) => `${v.toFixed(2)}%`}
          />
          <Slider
            value={riskPerTrade}
            onChange={setRiskPerTrade}
            min={0.25}
            max={5}
            step={0.25}
            minLabel="0.25%"
            maxLabel="5%+"
          />
        </MetricCard>

        <MetricCard
          title="Max daily loss"
          subtitle="When you stop. No more decisions for the day."
        >
          <NumberStepper
            value={dailyLoss}
            onChange={setDailyLoss}
            min={1}
            max={10}
            step={0.5}
            format={(v) => `${v.toFixed(2)}%`}
          />
          <Slider
            value={dailyLoss}
            onChange={setDailyLoss}
            min={1}
            max={10}
            step={0.5}
            minLabel="1%"
            maxLabel="10%+"
          />
        </MetricCard>

        <MetricCard
          title="Max leverage allowed"
          subtitle="Hard cap across perps and margin."
        >
          <NumberStepper
            value={maxLeverage}
            onChange={setMaxLeverage}
            min={1}
            max={50}
            step={1}
            format={(v) => (v === 1 ? "Spot only" : `${v}x`)}
          />
          <Slider
            value={maxLeverage}
            onChange={setMaxLeverage}
            min={1}
            max={50}
            step={1}
            minLabel="1x"
            maxLabel="50x+"
          />
        </MetricCard>

        <MetricCard
          title="Max open positions"
          subtitle="Concurrent positions across the book."
        >
          <NumberStepper
            value={maxOpenPositions}
            onChange={setMaxOpenPositions}
            min={1}
            max={10}
            step={1}
            format={(v) => `${v} positions`}
          />
          <Slider
            value={maxOpenPositions}
            onChange={setMaxOpenPositions}
            min={1}
            max={10}
            step={1}
            minLabel="1"
            maxLabel="10+"
          />
        </MetricCard>

        <MetricCard
          title="Max correlated exposure"
          subtitle="Cap on positions that move together (e.g. BTC + ETH)."
        >
          <NumberStepper
            value={maxCorrelatedExposure}
            onChange={setMaxCorrelatedExposure}
            min={1}
            max={5}
            step={1}
            format={(v) => `${v} positions`}
          />
          <Slider
            value={maxCorrelatedExposure}
            onChange={setMaxCorrelatedExposure}
            min={1}
            max={5}
            step={1}
            minLabel="1"
            maxLabel="5"
          />
        </MetricCard>

        <MetricCard
          title="Weekly drawdown limit"
          subtitle="Cumulative loss before a forced reset."
        >
          <NumberStepper
            value={weeklyDrawdown}
            onChange={setWeeklyDrawdown}
            min={2}
            max={20}
            step={1}
            format={(v) => `${v.toFixed(2)}%`}
          />
          <Slider
            value={weeklyDrawdown}
            onChange={setWeeklyDrawdown}
            min={2}
            max={20}
            step={1}
            minLabel="2%"
            maxLabel="20%+"
          />
        </MetricCard>

        <MetricCard
          title="Max same-day re-entries"
          subtitle="After closing, how many times can you re-enter."
        >
          <NumberStepper
            value={maxReentries}
            onChange={setMaxReentries}
            min={0}
            max={5}
            step={1}
            format={(v) => (v === 0 ? "None" : `${v} re-entries`)}
          />
          <Slider
            value={maxReentries}
            onChange={setMaxReentries}
            min={0}
            max={5}
            step={1}
            minLabel="0"
            maxLabel="5"
          />
        </MetricCard>
      </div>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-300">
            <ShieldOff className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-white">Special rules</h2>
            <p className="text-xs text-slate-300">
              Behavioral guardrails for the situations that hurt most. Toggle on
              what you want StandFast to enforce.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIAL_RULES.map((r) => {
            const Icon = r.icon;
            const on = rules.has(r.id);
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                  on
                    ? "border-cyan-400/40 bg-cyan-400/[0.06]"
                    : "border-white/[0.08] bg-[#0c1428]/80",
                )}
              >
                <div className="flex min-w-0 items-start gap-2">
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0 transition-colors",
                      on
                        ? "text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.4)]"
                        : "text-lime-400/85",
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold text-white">
                      {r.label}
                    </p>
                    <p className="text-[11px] leading-snug text-slate-300">
                      {r.description}
                    </p>
                  </div>
                </div>
                <Toggle checked={on} onChange={() => toggleRule(r.id)} />
              </div>
            );
          })}
        </div>
      </section>

      <Callout
        icon={Sparkles}
        title="Your framework protects you from emotional decisions — not your edge."
        text="These rules don't restrict you. They free you to trade what you trained for."
      />

      <StepFooter currentNum={6} onContinue={handleContinue} />
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <Info className="size-3 text-slate-500" />
        </div>
        <p className="text-[11px] leading-snug text-slate-400">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1428]/80 p-1">
      <button
        type="button"
        onClick={() => onChange(clamp(+(value - step).toFixed(2)))}
        disabled={value <= min}
        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.03] disabled:hover:text-slate-300"
      >
        <Minus className="size-3" />
      </button>
      <span className="flex-1 text-center text-sm font-semibold text-white">
        {format(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(+(value + step).toFixed(2)))}
        disabled={value >= max}
        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/[0.08] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.03] disabled:hover:text-slate-300"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
}) {
  const percent = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:size-4",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2",
          "[&::-webkit-slider-thumb]:border-cyan-400",
          "[&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.55)]",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:size-4",
          "[&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-cyan-400",
          "[&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:bg-white",
          "[&::-moz-range-thumb]:cursor-pointer",
        )}
        style={{
          background: `linear-gradient(to right, #22d3ee 0%, #06b6d4 ${percent}%, rgba(255,255,255,0.08) ${percent}%, rgba(255,255,255,0.08) 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-cyan-400" : "bg-white/[0.10]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-all duration-200",
          checked
            ? "left-[18px] shadow-[0_0_8px_rgba(34,211,238,0.55)]"
            : "left-0.5",
        )}
      />
    </button>
  );
}
