"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bitcoin,
  CandlestickChart,
  Check,
  Diamond,
  Globe,
  Lock,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MARKETS = [
  {
    id: "stocks",
    label: "STOCKS",
    description: "Equities & ETFs",
    icon: CandlestickChart,
  },
  {
    id: "futures",
    label: "FUTURES",
    description: "Index, Commodity, Rates & More",
    icon: TrendingUp,
  },
  {
    id: "options",
    label: "OPTIONS",
    description: "Options on Stocks, Indexes & ETFs",
    icon: Diamond,
  },
  {
    id: "forex",
    label: "FOREX",
    description: "Currency Pairs",
    icon: Globe,
  },
  {
    id: "crypto",
    label: "CRYPTO",
    description: "Cryptocurrency Markets",
    icon: Bitcoin,
  },
] as const;

type MarketId = (typeof MARKETS)[number]["id"];

export function MarketStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<MarketId | null>(null);

  function handleContinue() {
    console.log("[onboarding] market", { selected });
    router.push("/onboarding/experience");
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-10">
      <Image
        src="/standfast-logo.svg"
        alt="StandFast Technologies"
        width={280}
        height={80}
        priority
      />

      <div
        className={cn(
          "w-full rounded-[28px] border border-white/[0.08] p-10",
          "bg-gradient-to-b from-white/[0.06] to-white/[0.015]",
          "shadow-[0_0_80px_-20px_rgba(6,182,212,0.28),0_30px_80px_-20px_rgba(0,0,0,0.75)]",
          "backdrop-blur-2xl",
        )}
      >
        <div className="flex flex-col gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Step 1 of 9
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What market do you trade?
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            We&apos;ll tailor your experience, tools, and trading language to
            you.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {MARKETS.map((m, i) => {
            const Icon = m.icon;
            const isSelected = selected === m.id;
            const isLast = i === MARKETS.length - 1;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={cn(
                  "group/card relative flex items-center gap-3 rounded-2xl border p-5 pr-9 text-left",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-0.5",
                  isLast && "col-span-2",
                  isSelected
                    ? "border-lime-400/70 bg-gradient-to-br from-lime-400/[0.12] to-lime-400/[0.02] shadow-[0_0_30px_-5px_rgba(132,204,22,0.45)]"
                    : "border-white/[0.06] bg-white/[0.015] hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.30)]",
                )}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-lime-400 shadow-[0_0_14px_rgba(132,204,22,0.6)]">
                    <Check className="size-3 stroke-[3] text-lime-950" />
                  </div>
                )}
                <Icon
                  className={cn(
                    "size-10 shrink-0 transition-all duration-300",
                    isSelected
                      ? "text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.55)]"
                      : "text-cyan-400 group-hover/card:drop-shadow-[0_0_8px_rgba(6,182,212,0.45)]",
                  )}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm font-bold tracking-wide text-white">
                    {m.label}
                  </p>
                  <p className="text-xs leading-snug text-slate-400">
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={!selected}
          className={cn(
            "mt-8 h-14 w-full text-base font-semibold tracking-wide text-lime-950",
            "bg-gradient-to-r from-lime-400 to-lime-500",
            "shadow-[0_0_40px_-5px_rgba(132,204,22,0.55)]",
            "transition-all duration-200 ease-out",
            "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_55px_-5px_rgba(132,204,22,0.7)]",
            "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
          )}
        >
          Continue
          <ArrowRight />
        </Button>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="size-3" />
        Your data is private and secure
      </p>
    </div>
  );
}
