import {
  Activity,
  ArrowDown,
  ArrowUp,
  Brain,
  CheckCircle2,
  Lightbulb,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BEHAVIOR_PATTERNS = [
  "Revenge Trading",
  "Late Entries",
  "Emotional Re-entries",
  "Stop Movement",
  "Overtrading After Losses",
  "FOMO During Spikes",
] as const;

type TrendTone = "rose" | "emerald" | "brand";

const TREND_TONE: Record<TrendTone, string> = {
  rose: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  brand: "bg-brand/15 text-brand ring-brand/30",
};

type BehaviorTrend = {
  icon: LucideIcon;
  tone: TrendTone;
  label: string;
  change: number;
  favorable: boolean;
};

const BEHAVIOR_TRENDS: BehaviorTrend[] = [
  {
    icon: Activity,
    tone: "rose",
    label: "Impulsive Behavior",
    change: -18,
    favorable: false,
  },
  {
    icon: CheckCircle2,
    tone: "emerald",
    label: "Rule Adherence",
    change: 24,
    favorable: true,
  },
  {
    icon: PlusCircle,
    tone: "brand",
    label: "Emotional Re-entries",
    change: -21,
    favorable: true,
  },
];

export function PatternIntelligenceCard() {
  return (
    <Card className="border-border/60 bg-card/60 p-8">
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-brand">
            <Brain className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Pattern Intelligence
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground">
            Your patterns leave a trail.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Standfast identifies the behaviors that damage consistency.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">
              Behavior Patterns
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {BEHAVIOR_PATTERNS.map((pattern) => (
                <li
                  key={pattern}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full bg-brand"
                    />
                    <span className="text-foreground/85">{pattern}</span>
                  </span>
                  <ArrowUp className="size-3.5 text-rose-400" />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">
              Behavior Trend
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {BEHAVIOR_TRENDS.map(
                ({ icon: Icon, tone, label, change, favorable }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
                        TREND_TONE[tone],
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="flex flex-1 flex-col leading-tight">
                      <span className="text-sm font-medium text-foreground">
                        {label}
                      </span>
                      <span className="text-[0.65rem] text-muted-foreground">
                        vs last 30 days
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                        favorable ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {change >= 0 ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )}
                      {Math.abs(change)}%
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/[0.06] px-4 py-3">
          <Lightbulb className="size-4 shrink-0 text-brand" />
          <span className="text-sm font-medium text-brand">
            Awareness creates choice. Choice builds consistency.
          </span>
        </div>
      </div>
    </Card>
  );
}
