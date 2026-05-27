import type { RiskCalculationResult, RiskRules } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  risk: RiskCalculationResult;
  rules: RiskRules;
};

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null, digits = 2): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2)} : 1`;
}

export function RiskPreviewCard({ risk, rules }: Props) {
  const overTradeLimit =
    risk.accountRiskPercent != null &&
    risk.accountRiskPercent > rules.baseRiskPerTradePercent;

  const overDailyLimit =
    risk.projectedDailyRiskPercent != null &&
    risk.projectedDailyRiskPercent > rules.maxDailyLossPercent;

  const ratioTone =
    risk.rewardRiskRatio == null
      ? "text-foreground"
      : risk.rewardRiskRatio >= 2
        ? "text-emerald-400"
        : risk.rewardRiskRatio >= 1
          ? "text-amber-400"
          : "text-rose-400";

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Live Risk Preview
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Stocks · USD
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Risk / Share" value={formatCurrency(risk.riskPerShare)} />
        <Stat
          label="Total Trade Risk"
          value={formatCurrency(risk.totalRisk)}
          tone={overTradeLimit ? "rose" : "default"}
        />
        <Stat
          label="Est. Reward"
          value={formatCurrency(risk.estimatedReward)}
          tone="emerald"
        />
        <Stat
          label="Reward : Risk"
          value={formatRatio(risk.rewardRiskRatio)}
          valueClassName={ratioTone}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border/40 pt-4">
        <RiskBar
          label="Account at Risk (This Trade)"
          current={risk.accountRiskPercent}
          limit={rules.baseRiskPerTradePercent}
          breached={overTradeLimit}
        />
        <RiskBar
          label="Projected Daily Risk"
          current={risk.projectedDailyRiskPercent}
          limit={rules.maxDailyLossPercent}
          breached={overDailyLimit}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  valueClassName,
}: {
  label: string;
  value: string;
  tone?: "default" | "rose" | "emerald";
  valueClassName?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-400"
      : tone === "emerald"
        ? "text-emerald-400"
        : "text-foreground";
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-background/30 p-3">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-semibold tabular-nums leading-none",
          valueClassName ?? toneClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RiskBar({
  label,
  current,
  limit,
  breached,
}: {
  label: string;
  current: number | null;
  limit: number;
  breached: boolean;
}) {
  const safe = current ?? 0;
  const widthLimit = Math.max(limit, safe);
  const limitMarker = widthLimit > 0 ? (limit / widthLimit) * 100 : 0;
  const fillPercent = widthLimit > 0 ? Math.min(100, (safe / widthLimit) * 100) : 0;
  const barColor = breached ? "bg-rose-500" : safe >= limit * 0.8 ? "bg-amber-400" : "bg-brand";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            breached ? "text-rose-400" : "text-foreground",
          )}
        >
          {formatPercent(current)} / {limit.toFixed(2)}%
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${fillPercent}%` }}
        />
        <div
          className="absolute top-[-2px] h-[10px] w-px bg-foreground/40"
          style={{ left: `${limitMarker}%` }}
          aria-label={`Limit ${limit}%`}
        />
      </div>
    </div>
  );
}
