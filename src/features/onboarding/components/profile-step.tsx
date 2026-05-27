"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Crosshair,
  Gauge,
  LineChart,
  Newspaper,
  RotateCw,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Option = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MARKET_CAPS: Option[] = [
  {
    id: "small",
    label: "Small Cap",
    description: "Typically under $2B market cap",
    icon: TrendingUp,
  },
  {
    id: "mid",
    label: "Mid Cap",
    description: "Between $2B and $10B",
    icon: BarChart3,
  },
  {
    id: "large",
    label: "Large Cap",
    description: "Typically over $10B market cap",
    icon: Building2,
  },
];

const ENVIRONMENTS: Option[] = [
  {
    id: "momentum",
    label: "Momentum",
    description: "Strong price movement",
    icon: Zap,
  },
  {
    id: "news",
    label: "News Catalyst",
    description: "Earnings, news, events",
    icon: Newspaper,
  },
  {
    id: "mean-reversion",
    label: "Mean Reversion",
    description: "Reverting to the mean",
    icon: RotateCw,
  },
  {
    id: "trend",
    label: "Trend Continuation",
    description: "Following strong trends",
    icon: TrendingUp,
  },
  {
    id: "breakouts",
    label: "Technical Breakouts",
    description: "Key levels and patterns",
    icon: LineChart,
  },
];

const EXECUTION: Option[] = [
  {
    id: "scalping",
    label: "Scalping",
    description: "Quick trades, small profits",
    icon: Gauge,
  },
  {
    id: "intraday",
    label: "Intraday",
    description: "Open and close same day",
    icon: Clock,
  },
  {
    id: "swing",
    label: "Swing Trading",
    description: "Hold for several days to weeks",
    icon: TrendingUp,
  },
  {
    id: "position",
    label: "Position Trading",
    description: "Hold for weeks to months",
    icon: Calendar,
  },
];

const HOLDING_TIME: Option[] = [
  {
    id: "secs-mins",
    label: "Seconds to Minutes",
    description: "Very short-term",
    icon: Clock,
  },
  {
    id: "mins-hours",
    label: "Minutes to Hours",
    description: "Short-term",
    icon: Clock,
  },
  {
    id: "hours-days",
    label: "Hours to Days",
    description: "Medium-term",
    icon: Sun,
  },
  {
    id: "days-weeks",
    label: "Days to Weeks+",
    description: "Long-term",
    icon: Calendar,
  },
];

const FREQUENCY: Option[] = [
  {
    id: "high",
    label: "High Frequency",
    description: "Multiple times per day",
    icon: BarChart3,
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "A few times per week",
    icon: Activity,
  },
  {
    id: "selective",
    label: "Selective",
    description: "Opportunistic trades",
    icon: Crosshair,
  },
];

export function ProfileStep() {
  const router = useRouter();
  const [marketCaps, setMarketCaps] = useState<Set<string>>(new Set());
  const [environments, setEnvironments] = useState<Set<string>>(new Set());
  const [execution, setExecution] = useState<string | null>(null);
  const [holdingTime, setHoldingTime] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);

  const valid =
    marketCaps.size > 0 &&
    environments.size > 0 &&
    execution !== null &&
    holdingTime !== null &&
    frequency !== null;

  function toggleMulti(
    set: Set<string>,
    id: string,
    setter: (next: Set<string>) => void,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function handleContinue() {
    console.log("[onboarding] profile", {
      marketCaps: Array.from(marketCaps),
      environments: Array.from(environments),
      execution,
      holdingTime,
      frequency,
    });
    router.push("/onboarding/goals");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 3 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Trading profile
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Tell us about your markets, style, and execution so we can tailor
          everything to you.
        </p>
      </div>

      <NumberedSection
        num={1}
        title="What do you trade?"
        subtitle="Select all that apply."
      >
        <OptionGrid
          options={MARKET_CAPS}
          cols={3}
          isSelected={(id) => marketCaps.has(id)}
          onToggle={(id) => toggleMulti(marketCaps, id, setMarketCaps)}
          variant="multi"
        />
      </NumberedSection>

      <NumberedSection
        num={2}
        title="What type of environments do you focus on?"
        subtitle="Select all that apply."
      >
        <OptionGrid
          options={ENVIRONMENTS}
          cols={5}
          isSelected={(id) => environments.has(id)}
          onToggle={(id) => toggleMulti(environments, id, setEnvironments)}
          variant="multi"
        />
      </NumberedSection>

      <NumberedSection
        num={3}
        title="How do you execute your trades?"
        subtitle="Choose the one that best fits you."
      >
        <OptionGrid
          options={EXECUTION}
          cols={4}
          isSelected={(id) => execution === id}
          onToggle={(id) => setExecution(id)}
        />
      </NumberedSection>

      <NumberedSection
        num={4}
        title="What's your typical holding time?"
        subtitle="Choose the one that's most accurate."
      >
        <OptionGrid
          options={HOLDING_TIME}
          cols={4}
          isSelected={(id) => holdingTime === id}
          onToggle={(id) => setHoldingTime(id)}
        />
      </NumberedSection>

      <NumberedSection
        num={5}
        title="How often do you trade?"
        subtitle="Choose the one that best describes you."
      >
        <OptionGrid
          options={FREQUENCY}
          cols={3}
          isSelected={(id) => frequency === id}
          onToggle={(id) => setFrequency(id)}
        />
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
    <section className="grid grid-cols-1 gap-5 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5 lg:grid-cols-[1fr_2.6fr] lg:items-center lg:gap-6">
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

const COL_CLASS: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

function OptionGrid({
  options,
  cols,
  isSelected,
  onToggle,
  variant = "single",
}: {
  options: Option[];
  cols: 3 | 4 | 5;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  variant?: "single" | "multi";
}) {
  return (
    <div className={cn("grid gap-2.5", COL_CLASS[cols])}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const selected = isSelected(opt.id);
        return (
          <PickCard
            key={opt.id}
            variant={variant}
            selected={selected}
            onClick={() => onToggle(opt.id)}
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
              <p className="text-xs font-semibold text-white">{opt.label}</p>
              <p className="text-[11px] leading-snug text-slate-300">
                {opt.description}
              </p>
            </div>
          </PickCard>
        );
      })}
    </div>
  );
}
