"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Info,
  Lightbulb,
  LineChart,
  Minus,
  PieChart,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type RiskToleranceId = "conservative" | "moderate" | "aggressive";

const RISK_TOLERANCE_OPTIONS: {
  id: RiskToleranceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "conservative", label: "Conservative", icon: ShieldCheck },
  { id: "moderate", label: "Moderate", icon: ShieldHalf },
  { id: "aggressive", label: "Aggressive", icon: ShieldAlert },
];

const POSITION_SIZING = [
  { id: "percent", label: "% of Account", icon: PieChart },
  { id: "fixed", label: "Fixed $ Amount", icon: DollarSign },
  { id: "atr", label: "ATR Based", icon: LineChart },
];

const GUARDRAIL_BULLETS = [
  "Set guardrails and alerts",
  "Evaluate performance quality",
  "Keep you aligned with your plan",
  "Protect your long-term edge",
];

const MAX_RULES_CHARS = 250;

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RiskStep() {
  const router = useRouter();

  // accountSize is shared state — `riskRules.accountSize` is the single
  // source of truth used by the Risk Rules page, the Trade Desk validation
  // engine, and the dashboard metrics. Hydrate the local form state from
  // it so revisiting this step always shows the user's current value, and
  // commit back on Continue via `setAccountSize` so the rest of the app
  // picks the change up immediately.
  const storedAccountSize = useAppStore((s) => s.riskRules.accountSize);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const setAccountSize = useAppStore((s) => s.setAccountSize);

  const [accountSizeText, setAccountSizeText] = useState(() =>
    formatCurrency(storedAccountSize > 0 ? storedAccountSize : 10_000),
  );
  const [riskTolerance, setRiskTolerance] = useState<RiskToleranceId>("moderate");
  const [riskPerTrade, setRiskPerTrade] = useState(1.0);
  const [dailyLossLimit, setDailyLossLimit] = useState(3.0);
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState(3);
  const [maxDrawdown, setMaxDrawdown] = useState(10.0);
  const [positionSizing, setPositionSizing] = useState<string | null>("percent");
  const [additionalRules, setAdditionalRules] = useState("");

  // After persist rehydration, replace the SSR/default seed with the real
  // saved value. Runs once per hydration — `setAccountSizeText` is stable.
  // The set-state-in-effect disable mirrors the same pattern used by
  // RulesRiskWorkspace's hydration sync — we have no external system to
  // subscribe to, just the one-shot rehydrated value.
  useEffect(() => {
    if (hasHydrated && storedAccountSize > 0) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setAccountSizeText(formatCurrency(storedAccountSize));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const accountSize = parseFloat(accountSizeText.replace(/,/g, "")) || 0;
  const valid = positionSizing !== null && accountSize > 0;

  const riskPerTradeDollar = (accountSize * riskPerTrade) / 100;
  const dailyLossDollar = (accountSize * dailyLossLimit) / 100;

  const activeRiskTolerance =
    RISK_TOLERANCE_OPTIONS.find((r) => r.id === riskTolerance) ??
    RISK_TOLERANCE_OPTIONS[1];

  function handleContinue() {
    // Commit accountSize to the shared store before navigation so the
    // Risk Rules page (and any other consumer of `riskRules.accountSize`)
    // reflects what the user just entered. The other onboarding risk
    // fields aren't persisted yet — they'll be wired up when their own
    // sections on the Rules & Risk page need them.
    setAccountSize(accountSize);
    console.log("[onboarding] risk", {
      accountSize,
      riskTolerance,
      riskPerTrade,
      dailyLossLimit,
      maxConsecutiveLosses,
      maxDrawdown,
      positionSizing,
      additionalRules,
    });
    router.push("/onboarding/platform");
  }

  function reformatAccountSize() {
    setAccountSizeText(formatCurrency(accountSize));
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 7 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your risk framework
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Let&apos;s define the rules that protect your capital and keep you in
          control.
        </p>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-300">
            <Shield className="size-5" />
          </div>
          <h2 className="text-sm font-semibold text-white">
            Account &amp; Risk Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
          <FieldBlock label="Account Size">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c1428]/80 px-3 transition-colors focus-within:border-cyan-400/60">
              <span className="text-sm text-slate-400">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={accountSizeText}
                onChange={(e) => setAccountSizeText(e.target.value)}
                onBlur={reformatAccountSize}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none"
              />
              <span className="text-[11px] font-semibold tracking-wide text-slate-400">
                USD
              </span>
            </div>
          </FieldBlock>

          <FieldBlock label="Risk Tolerance" infoIcon>
            <RiskToleranceDropdown
              value={activeRiskTolerance}
              onChange={setRiskTolerance}
            />
          </FieldBlock>

          <InlineCallout
            icon={Lightbulb}
            text="These rules help us provide personalized insights and risk guardrails."
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Risk Per Trade" subtitle="How much of your account are you willing to risk on a single trade?">
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
          <p className="text-center text-[11px] text-slate-400">
            <span className="font-semibold text-white">
              ${formatCurrency(riskPerTradeDollar)}
            </span>{" "}
            of account
          </p>
        </MetricCard>

        <MetricCard title="Daily Loss Limit" subtitle="What's the most you'll risk in a single day?">
          <NumberStepper
            value={dailyLossLimit}
            onChange={setDailyLossLimit}
            min={1}
            max={10}
            step={0.5}
            format={(v) => `${v.toFixed(2)}%`}
          />
          <Slider
            value={dailyLossLimit}
            onChange={setDailyLossLimit}
            min={1}
            max={10}
            step={0.5}
            minLabel="1%"
            maxLabel="10%+"
          />
          <p className="text-center text-[11px] text-slate-400">
            <span className="font-semibold text-white">
              ${formatCurrency(dailyLossDollar)}
            </span>{" "}
            of account
          </p>
        </MetricCard>

        <MetricCard title="Max Consecutive Losses" subtitle="How many losing trades in a row will trigger a reset?">
          <NumberStepper
            value={maxConsecutiveLosses}
            onChange={setMaxConsecutiveLosses}
            min={1}
            max={10}
            step={1}
            format={(v) => `${v} trades`}
          />
          <Slider
            value={maxConsecutiveLosses}
            onChange={setMaxConsecutiveLosses}
            min={1}
            max={10}
            step={1}
            minLabel="1"
            maxLabel="10+"
          />
        </MetricCard>

        <MetricCard title="Max Drawdown" subtitle="What's the maximum drawdown you're comfortable with?">
          <NumberStepper
            value={maxDrawdown}
            onChange={setMaxDrawdown}
            min={5}
            max={30}
            step={1}
            format={(v) => `${v.toFixed(2)}%`}
          />
          <Slider
            value={maxDrawdown}
            onChange={setMaxDrawdown}
            min={5}
            max={30}
            step={1}
            minLabel="5%"
            maxLabel="30%+"
          />
        </MetricCard>

        <MetricCard title="Position Sizing Method" subtitle="How do you determine your position size?">
          <div className="grid grid-cols-2 gap-2">
            {POSITION_SIZING.map((opt) => {
              const Icon = opt.icon;
              const isSelected = positionSizing === opt.id;
              return (
                <PickCard
                  key={opt.id}
                  variant="single"
                  selected={isSelected}
                  onClick={() => setPositionSizing(opt.id)}
                  className="items-center gap-2 px-3 py-2.5 pr-8"
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isSelected
                        ? "text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.4)]"
                        : "text-lime-400/85",
                    )}
                  />
                  <span className="text-[11px] font-semibold text-white">
                    {opt.label}
                  </span>
                </PickCard>
              );
            })}
          </div>
        </MetricCard>

        <MetricCard title="Additional Rules (Optional)" subtitle="Add any key rules you always follow.">
          <textarea
            value={additionalRules}
            onChange={(e) =>
              e.target.value.length <= MAX_RULES_CHARS &&
              setAdditionalRules(e.target.value)
            }
            placeholder={
              "Example: I never hold overnight...\nI don't trade 15 min before news..."
            }
            rows={4}
            className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#0c1428]/80 p-3 text-xs text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30"
          />
          <p className="text-right text-[10px] text-slate-400">
            <span className="font-semibold text-slate-300">
              {additionalRules.length}
            </span>{" "}
            / {MAX_RULES_CHARS} characters
          </p>
        </MetricCard>
      </div>

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:shrink-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
              <Shield className="size-5" />
            </div>
            <p className="text-sm font-semibold text-white">
              We&apos;ll use your risk framework to:
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:flex-1">
            {GUARDRAIL_BULLETS.map((b) => (
              <div
                key={b}
                className="flex items-center gap-2 text-xs text-slate-300"
              >
                <CheckCircle2 className="size-4 shrink-0 text-lime-400" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      <StepFooter
        currentNum={7}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function FieldBlock({
  label,
  infoIcon,
  children,
}: {
  label: string;
  infoIcon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {infoIcon && <Info className="size-3 text-slate-500" />}
      </div>
      {children}
    </div>
  );
}

function InlineCallout({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
        <Icon className="size-4" />
      </div>
      <p className="text-[11px] leading-relaxed text-slate-300">{text}</p>
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

function RiskToleranceDropdown({
  value,
  onChange,
}: {
  value: { id: RiskToleranceId; label: string; icon: React.ComponentType<{ className?: string }> };
  onChange: (v: RiskToleranceId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = value.icon;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 transition-colors",
          open
            ? "border-cyan-400/60 bg-cyan-400/[0.05]"
            : "border-white/[0.08] bg-[#0c1428]/80 hover:border-cyan-400/40",
        )}
      >
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-lime-400/85" />
          <span className="text-sm font-semibold text-white">{value.label}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-white/[0.10] bg-[#08111f]/95 p-1 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl duration-150 animate-in fade-in slide-in-from-top-1">
          {RISK_TOLERANCE_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const selected = value.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selected
                    ? "bg-cyan-400/[0.10] text-white"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <span className="flex items-center gap-2">
                  <OptIcon className="size-4 text-lime-400/85" />
                  <span>{opt.label}</span>
                </span>
                {selected && (
                  <Check className="size-3.5 stroke-[3] text-cyan-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
