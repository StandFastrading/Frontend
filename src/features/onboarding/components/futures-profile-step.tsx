"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bitcoin,
  CircleDollarSign,
  Clock,
  Coins,
  Droplet,
  Flame,
  Gauge,
  Hash,
  LineChart,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Wheat,
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
    description: "Flat at the close. Every day.",
    icon: Clock,
  },
  {
    id: "swing-trader",
    label: "Swing Trader",
    description: "Hold positions over days to weeks.",
    icon: TrendingUp,
  },
  {
    id: "trend-trader",
    label: "Trend Trader",
    description: "Ride the dominant direction.",
    icon: LineChart,
  },
  {
    id: "momentum-trader",
    label: "Momentum Trader",
    description: "Chase strength, fade weakness.",
    icon: Zap,
  },
];

const PRODUCTS: Option[] = [
  { id: "es", label: "ES (S&P 500)", description: "Flagship equity index.", icon: TrendingUp },
  { id: "nq", label: "NQ (Nasdaq)", description: "Tech-heavy index.", icon: Activity },
  { id: "ym", label: "YM (Dow)", description: "30 blue chips.", icon: LineChart },
  { id: "rty", label: "RTY (Russell)", description: "Small-cap exposure.", icon: Hash },
  { id: "cl", label: "CL (Crude Oil)", description: "Energy benchmark.", icon: Droplet },
  { id: "gc", label: "GC (Gold)", description: "Safe-haven metal.", icon: CircleDollarSign },
  { id: "si", label: "SI (Silver)", description: "Industrial + monetary.", icon: Coins },
  { id: "ng", label: "NG (Natural Gas)", description: "Volatile energy.", icon: Flame },
  { id: "zb-zn", label: "ZB / ZN (Bonds)", description: "Treasuries, rates plays.", icon: Wheat },
  { id: "micros", label: "MES / MNQ (Micros)", description: "1/10 size of E-minis.", icon: Bitcoin },
];

const SESSIONS: Option[] = [
  { id: "pre-market", label: "Pre-Market", description: "Before the open.", icon: Sunrise },
  { id: "ny-open", label: "NY Open", description: "First-hour action.", icon: Sun },
  { id: "midday", label: "Midday", description: "Lunch lull or continuation.", icon: Clock },
  { id: "power-hour", label: "Power Hour", description: "Last hour of cash session.", icon: Sunset },
  { id: "overnight", label: "Overnight / Globex", description: "After-hours and overseas.", icon: Moon },
];

const CONTRACT_SIZES = [
  { id: "1-2", label: "1 – 2" },
  { id: "3-5", label: "3 – 5" },
  { id: "5-10", label: "5 – 10" },
  { id: "10plus", label: "10+" },
];

export function FuturesProfileStep() {
  const router = useRouter();
  const [traderType, setTraderType] = useState<string | null>(null);
  const [products, setProducts] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<string | null>(null);
  const [contracts, setContracts] = useState<string | null>(null);

  const valid =
    traderType !== null &&
    products.size > 0 &&
    session !== null &&
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
    console.log("[onboarding] futures.profile", {
      traderType,
      products: Array.from(products),
      session,
      contracts,
    });
    router.push("/onboarding/futures/setups");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 3 of 7
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your futures trading profile
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Tell us how you typically trade futures markets.
        </p>
      </div>

      <NumberedSection
        num={1}
        title="What type of futures trader are you?"
        subtitle="Pick the style that fits most sessions."
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
        title="What futures products do you trade?"
        subtitle="Select all that apply."
      >
        <OptionGrid
          options={PRODUCTS}
          cols={5}
          isSelected={(id) => products.has(id)}
          onToggle={(id) => toggleProduct(id)}
          variant="multi"
        />
      </NumberedSection>

      <NumberedSection
        num={3}
        title="What session do you primarily trade?"
        subtitle="The one you're most active in."
      >
        <OptionGrid
          options={SESSIONS}
          cols={5}
          isSelected={(id) => session === id}
          onToggle={(id) => setSession(id)}
        />
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
  cols: 4 | 5;
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
