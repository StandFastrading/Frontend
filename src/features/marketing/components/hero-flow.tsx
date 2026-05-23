import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  LineChart,
  Lock,
  ShieldCheck,
  Target,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

const CHECKLIST = [
  { icon: Target, label: "Is this part of your plan?" },
  { icon: TrendingDown, label: "Are you revenge trading?" },
  { icon: LineChart, label: "Has market structure changed?" },
  { icon: Brain, label: "Are you in the right mindset?" },
] as const;

const SPARK_POINTS: ReadonlyArray<readonly [number, number]> = [
  [4, 108],
  [18, 112],
  [32, 100],
  [46, 110],
  [60, 92],
  [74, 100],
  [88, 78],
  [102, 88],
  [116, 64],
  [130, 74],
  [144, 48],
  [158, 58],
  [172, 30],
  [186, 22],
  [196, 8],
];

function BehaviorSparkline() {
  const path = SPARK_POINTS.map(
    ([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`,
  ).join(" ");
  return (
    <svg viewBox="0 0 200 120" aria-hidden className="w-full">
      <path
        d={path}
        fill="none"
        stroke="#ff3b5c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {SPARK_POINTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#ff3b5c" />
      ))}
    </svg>
  );
}

type StepProps = {
  n: number;
  children: React.ReactNode;
};

function Step({ n, children }: StepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <div className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand ring-1 ring-brand/30">
          {n}
        </div>
      </div>
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      aria-hidden
      className="hidden items-center justify-center pt-10 text-muted-foreground/40 lg:flex"
    >
      <ArrowRight className="size-5 animate-pulse" />
    </div>
  );
}

type HeroFlowProps = {
  className?: string;
};

export function HeroFlow({ className }: HeroFlowProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 items-stretch gap-6 lg:-mt-24 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-3",
        className,
      )}
    >
      {/* ── Card 1: Behavior Detected ──────────────────────────────── */}
      <Step n={1}>
        <div
          className={cn(
            "relative flex h-full flex-col gap-4 rounded-xl border border-rose-500/40 bg-card/80 p-5 backdrop-blur",
            "shadow-[0_0_44px_-14px_rgba(244,63,94,0.55)]",
          )}
        >
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="size-3.5" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
              Behavior Detected
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              Detected rapid re-entry behavior
            </h3>
            <p className="text-xs text-muted-foreground">
              3 trades in 11 minutes
            </p>
          </div>
          <BehaviorSparkline />
          <div className="mt-auto flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-rose-300">
              Emotional Risk: Elevated
            </span>
          </div>
        </div>
      </Step>

      <FlowArrow />

      {/* ── Card 2: Intervention Triggered ─────────────────────────── */}
      <Step n={2}>
        <div
          className={cn(
            "relative flex h-full flex-col gap-4 rounded-xl border border-brand/40 bg-card/80 p-5 backdrop-blur",
            "shadow-[0_0_44px_-14px_oklch(0.62_0.22_255/0.55)]",
          )}
        >
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck className="size-3.5" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
              Intervention Triggered
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold uppercase leading-snug tracking-tight text-foreground">
              Pause Before Execution
            </h3>
            <p className="text-xs text-muted-foreground">
              Review before you proceed.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 rounded-lg border border-border/40 bg-background/40 p-3">
            {CHECKLIST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs text-foreground/85">{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3 text-brand">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
              Confirm Intent to Proceed
            </span>
            <Lock className="size-3.5" />
          </div>
        </div>
      </Step>

      <FlowArrow />

      {/* ── Card 3: Decision Outcome ───────────────────────────────── */}
      <Step n={3}>
        <div
          className={cn(
            "relative flex h-full flex-col gap-3 rounded-xl border border-brand/40 bg-card/80 p-5 backdrop-blur",
            "shadow-[0_0_44px_-14px_oklch(0.62_0.22_255/0.55)]",
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">
              Decision Outcome
            </span>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
                Trade Avoided
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">Good call.</p>
            <p className="text-xs text-muted-foreground">
              You protected your edge.
            </p>
          </div>

          <div
            aria-hidden
            className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground/50"
          >
            <span className="h-px flex-1 bg-border/60" />
            <span>or</span>
            <span className="h-px flex-1 bg-border/60" />
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="size-3.5" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
                Rule Violation Logged
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              Re-entry after loss
            </p>
            <p className="text-xs text-muted-foreground">Review and learn.</p>
          </div>

          <button
            type="button"
            className="mt-auto rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            View Log
          </button>
        </div>
      </Step>
    </div>
  );
}
