"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock,
  Coins,
  DollarSign,
  Gauge,
  Layers,
  LineChart,
  Newspaper,
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
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TRADER_TYPES: Option[] = [
  {
    id: "scalper",
    label: "Scalper",
    description: "In and out in seconds to minutes.",
    icon: Gauge,
  },
  {
    id: "day-trader",
    label: "Day Trader",
    description: "Open and close inside the same session.",
    icon: Clock,
  },
  {
    id: "swing-trader",
    label: "Swing Trader",
    description: "Hold positions over days to weeks.",
    icon: TrendingUp,
  },
  {
    id: "event-trader",
    label: "Event Trader",
    description: "Trade earnings, news, and catalysts.",
    icon: Newspaper,
  },
  {
    id: "income-trader",
    label: "Income Trader",
    description: "Sell premium for consistent income.",
    icon: DollarSign,
  },
];

const PRODUCTS: Option[] = [
  { id: "equity", label: "Equity Options", description: "Single-stock options.", icon: LineChart },
  { id: "index", label: "Index Options", description: "SPX, NDX, RUT, VIX.", icon: Layers },
  { id: "spy-qqq", label: "SPY / QQQ", description: "ETF flagships, deep liquidity.", icon: Zap },
  { id: "futures", label: "Futures Options", description: "/ES, /NQ, /CL and more.", icon: Briefcase },
  { id: "etf", label: "ETF Options", description: "Sector and thematic ETFs.", icon: Coins },
  { id: "0dte", label: "0DTE Contracts", description: "Same-day expirations.", icon: CalendarClock },
];

const EXPIRATIONS: Option[] = [
  { id: "0dte", label: "Same Day (0DTE)", icon: CalendarClock },
  { id: "1-7d", label: "1 – 7 Days", icon: Calendar },
  { id: "1-4w", label: "1 – 4 Weeks", icon: CalendarRange },
  { id: "1-3m", label: "1 – 3 Months", icon: CalendarDays },
  { id: "leaps", label: "LEAPS", icon: Sun },
];

const CONTRACT_SIZES = [
  { id: "1-2", label: "1 – 2" },
  { id: "3-5", label: "3 – 5" },
  { id: "5-10", label: "5 – 10" },
  { id: "10plus", label: "10+" },
];

export function OptionsProfileStep() {
  const router = useRouter();
  const [traderType, setTraderType] = useState<string | null>(null);
  const [products, setProducts] = useState<Set<string>>(new Set());
  const [expiration, setExpiration] = useState<string | null>(null);
  const [contracts, setContracts] = useState<string | null>(null);

  const valid =
    traderType !== null &&
    products.size > 0 &&
    expiration !== null &&
    contracts !== null;

  function toggleProduct(id: string) {
    setProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    console.log("[onboarding] options.profile", {
      traderType,
      products: Array.from(products),
      expiration,
      contracts,
    });
    router.push("/onboarding/options/strategies");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 3 of 6
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your options trading profile
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Tell us how you typically trade options.
        </p>
      </div>

      <NumberedSection
        num={1}
        title="What type of options trader are you?"
        subtitle="Pick the style that fits most days."
      >
        <OptionGrid
          options={TRADER_TYPES}
          cols={5}
          isSelected={(id) => traderType === id}
          onToggle={(id) => setTraderType(id)}
        />
      </NumberedSection>

      <NumberedSection
        num={2}
        title="What products do you trade?"
        subtitle="Select all that apply."
      >
        <OptionGrid
          options={PRODUCTS}
          cols={3}
          isSelected={(id) => products.has(id)}
          onToggle={(id) => toggleProduct(id)}
          variant="multi"
        />
      </NumberedSection>

      <NumberedSection
        num={3}
        title="What's your typical expiration preference?"
        subtitle="The one you reach for most often."
      >
        <div className="flex flex-wrap gap-2">
          {EXPIRATIONS.map((e) => {
            const Icon = e.icon;
            const isSelected = expiration === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setExpiration(e.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200",
                  isSelected
                    ? "border-cyan-400/70 bg-cyan-400/[0.10] text-white shadow-[0_0_15px_-3px_rgba(34,211,238,0.45)]"
                    : "border-white/[0.08] bg-[#0c1428]/80 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5",
                    isSelected ? "text-lime-400" : "text-lime-400/85",
                  )}
                />
                {e.label}
              </button>
            );
          })}
        </div>
      </NumberedSection>

      <NumberedSection
        num={4}
        title="How many contracts do you typically trade?"
        subtitle="Per position, not per day."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CONTRACT_SIZES.map((c) => {
            const isSelected = contracts === c.id;
            return (
              <PickCard
                key={c.id}
                variant="single"
                selected={isSelected}
                onClick={() => setContracts(c.id)}
                className="items-center justify-center py-5 text-center"
              >
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isSelected ? "text-cyan-300" : "text-white",
                  )}
                >
                  {c.label}
                </span>
              </PickCard>
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
              {opt.description && (
                <p className="text-[11px] leading-snug text-slate-300">
                  {opt.description}
                </p>
              )}
            </div>
          </PickCard>
        );
      })}
    </div>
  );
}
