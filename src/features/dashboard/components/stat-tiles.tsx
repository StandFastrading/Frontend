import { ArrowRight, ArrowUp, Brain, TriangleAlert } from "lucide-react";

import {
  DISCIPLINE,
  IMPULSIVE_ACTIONS,
  RULES_FOLLOWED,
  SESSION,
  WARNINGS_IGNORED,
} from "@/features/dashboard/mock-data";
import { cn } from "@/lib/utils";

function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur",
        className,
      )}
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function DisciplineGauge({ score, max }: { score: number; max: number }) {
  const percent = Math.min(1, score / max);
  const radius = 52;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - percent);
  return (
    <svg viewBox="0 0 140 80" aria-hidden className="h-20 w-full">
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="oklch(0.62 0.22 255)" stopOpacity="0.4" />
          <stop offset="1" stopColor="oklch(0.62 0.22 255)" />
        </linearGradient>
      </defs>
      <path
        d={`M 18 70 A ${radius} ${radius} 0 0 1 122 70`}
        fill="none"
        stroke="oklch(1 0 0 / 0.08)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M 18 70 A ${radius} ${radius} 0 0 1 122 70`}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function StatTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Session State */}
      <Tile label="Session State">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Brain className="size-5" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
              {SESSION.state}
            </span>
            <span className="text-xs text-muted-foreground">
              {SESSION.stateMessage}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-white/15 bg-background/40 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          View Details
          <ArrowRight className="size-3" />
        </button>
      </Tile>

      {/* Discipline Score */}
      <Tile label="Discipline Score">
        <div className="relative flex flex-col items-center">
          <DisciplineGauge score={DISCIPLINE.score} max={DISCIPLINE.max} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-4xl font-semibold leading-none text-foreground">
              {DISCIPLINE.score}
              <span className="text-base text-muted-foreground"> /{DISCIPLINE.max}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
          <ArrowUp className="size-3.5" />
          <span className="font-semibold">{DISCIPLINE.delta} pts</span>
          <span className="text-muted-foreground">{DISCIPLINE.comparedTo}</span>
        </div>
      </Tile>

      {/* Rules Followed */}
      <Tile label="Rules Followed">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold leading-none text-foreground">
            {RULES_FOLLOWED.current}
          </span>
          <span className="text-base text-muted-foreground">
            / {RULES_FOLLOWED.total}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {RULES_FOLLOWED.adherence}% Adherence
        </span>
        <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${RULES_FOLLOWED.adherence}%` }}
          />
        </div>
      </Tile>

      {/* Impulsive Actions */}
      <Tile label="Impulsive Actions">
        <div className="flex items-baseline">
          <span className="text-4xl font-semibold leading-none text-rose-400">
            {IMPULSIVE_ACTIONS.value}
          </span>
        </div>
        <div className="mt-auto flex items-center gap-1.5 text-xs text-rose-400">
          <TriangleAlert className="size-3.5" />
          <span>{IMPULSIVE_ACTIONS.message}</span>
        </div>
      </Tile>

      {/* Warnings Ignored */}
      <Tile label="Warnings Ignored">
        <div className="flex items-baseline">
          <span className="text-4xl font-semibold leading-none text-rose-400">
            {WARNINGS_IGNORED.value}
          </span>
        </div>
        <div className="mt-auto text-xs text-rose-400">
          {WARNINGS_IGNORED.message}
        </div>
      </Tile>
    </div>
  );
}
