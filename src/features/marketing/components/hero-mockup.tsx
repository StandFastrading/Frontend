import { TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatProps = {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
};

function Stat({ label, value, valueClassName, hint }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-xl font-semibold", valueClassName)}>
        {value}
      </span>
      {hint && (
        <span className="text-[0.65rem] text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

function Sparkline() {
  return (
    <svg
      viewBox="0 0 120 36"
      preserveAspectRatio="none"
      className="h-9 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 28 L12 24 L24 26 L36 18 L48 22 L60 14 L72 16 L84 8 L96 12 L108 6 L120 4 L120 36 L0 36 Z"
        fill="url(#spark)"
      />
      <path
        d="M0 28 L12 24 L24 26 L36 18 L48 22 L60 14 L72 16 L84 8 L96 12 L108 6 L120 4"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroMockup() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Session Overview
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Discipline Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">82</span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400">
              <TrendingUp className="size-3" />
              12%
            </span>
          </div>
          <Sparkline />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
          <Stat label="Trades Taken" value="5" />
          <Stat label="Trades Avoided" value="3" />
          <Stat
            label="Total R"
            value="+6.42R"
            valueClassName="text-emerald-400"
          />
          <Stat label="Rules Followed" value="87%" />
        </div>
      </Card>
      <Card className="border-border/60 bg-card/80 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Active Trade
          </span>
          <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-brand">
            Long
          </span>
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">NVDA</div>
        <dl className="mt-5 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Entry</dt>
            <dd className="font-medium">875.40</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Stop</dt>
            <dd className="font-medium">868.00</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Position Size</dt>
            <dd className="font-medium">800 / share</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">R on trade</dt>
            <dd className="font-medium text-emerald-400">+1.32R</dd>
          </div>
        </dl>
        <button
          type="button"
          className="mt-5 w-full rounded-md bg-brand py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Trade Actions
        </button>
      </Card>
    </div>
  );
}
