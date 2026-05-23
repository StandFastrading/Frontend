import { ChevronDown, Plus, TrendingUp } from "lucide-react";

import { SESSION } from "@/features/dashboard/mock-data";

export function DashboardHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&rsquo;s your behavioral overview for today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-card/60 px-3 py-2 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative size-2 rounded-full bg-emerald-400" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground">
              Session: {SESSION.label}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              Started {SESSION.startedAt}
            </span>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-card/60 px-3 py-2 backdrop-blur">
          <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <TrendingUp className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              P/L Today
            </span>
            <span className="text-sm font-semibold tabular-nums text-emerald-400">
              +$1,247.50
            </span>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Start New Session
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
