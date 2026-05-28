"use client";

import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RuleCheckResult } from "@/features/desk/types";
import type {
  RiskCalculationResult,
  RiskRules,
  ValidationSeverity,
} from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: RuleCheckResult[];
  risk: RiskCalculationResult;
  rules: RiskRules;
  validationStatus: ValidationSeverity | null;
  onContinueAnyway: () => void;
  onReviseTrade: () => void;
  onCancelTrade: () => void;
  // Fired by the approved-path "Confirm Trade Plan" button. The slice's
  // closeModal preserves hasCheckedTrade + approvedSnapshot so the outer
  // "Mark Trade as Active" CTA stays available after dismissal.
  onConfirmApproval: () => void;
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

export function RuleCheckModal({
  open,
  onOpenChange,
  results,
  risk,
  rules,
  validationStatus,
  onContinueAnyway,
  onReviseTrade,
  onCancelTrade,
  onConfirmApproval,
}: Props) {
  const failures = results.filter((r) => r.status === "fail");
  const warnings = results.filter((r) => r.status === "warning");
  const hasFail = failures.length > 0;
  const isApproved = validationStatus === "approved";
  const issues = [...failures, ...warnings];

  // Approved trades have no issues to enumerate, so the modal cannot fall
  // back to the legacy `primary = failures[0] ?? warnings[0]` early-return
  // guard. We instead bail only when both the issue list is empty AND we
  // aren't on the approval path — that combination shouldn't happen, but
  // the guard keeps us from rendering an empty modal if it ever does.
  if (issues.length === 0 && !isApproved) return null;

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

  let title: string;
  let summary: string;
  if (isApproved) {
    title = "Trade approved — review risk";
    summary = "All rules passed. Confirm the numbers below before marking the trade active.";
  } else if (hasFail) {
    title = "Trade requires review";
    summary = `${failures.length} rule${failures.length === 1 ? "" : "s"} failed${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}.`;
  } else {
    title = "Trade triggers a warning";
    summary = `${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`;
  }

  const iconWrapClass = isApproved
    ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
    : hasFail
      ? "bg-rose-500/15 text-rose-400 ring-rose-500/30"
      : "bg-amber-500/15 text-amber-400 ring-amber-500/30";
  const HeaderIcon = isApproved
    ? ShieldCheck
    : hasFail
      ? ShieldOff
      : AlertTriangle;

  return (
    <Dialog
      open={open}
      // Required-action modal: only the action buttons below can dismiss it.
      // We ignore base-ui's close events (outside click, escape, X). Programmatic
      // closes from action handlers set parent state directly, which still
      // closes the modal via the controlled `open` prop.
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
      }}
      disablePointerDismissal
    >
      <DialogContent
        showCloseButton={false}
        className="dark flex max-w-lg flex-col gap-5 border border-white/15 bg-card/95 p-5 text-foreground sm:max-w-lg"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
              iconWrapClass,
            )}
          >
            <HeaderIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {summary}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-background/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Risk Snapshot
            </span>
            <span
              className={cn(
                "text-[0.65rem] font-semibold uppercase tracking-[0.18em]",
                ratioTone,
              )}
            >
              R:R {formatRatio(risk.rewardRiskRatio)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <RiskCell label="Risk / Share" value={formatCurrency(risk.riskPerShare)} />
            <RiskCell
              label="Total Trade Risk"
              value={formatCurrency(risk.totalRisk)}
              tone={overTradeLimit ? "rose" : "default"}
            />
            <RiskCell
              label="Account Risk"
              value={formatPercent(risk.accountRiskPercent)}
              tone={overTradeLimit ? "rose" : "default"}
              hint={`Limit ${rules.baseRiskPerTradePercent.toFixed(2)}%`}
            />
            <RiskCell
              label="Projected Daily Risk"
              value={formatPercent(risk.projectedDailyRiskPercent)}
              tone={overDailyLimit ? "rose" : "default"}
              hint={`Limit ${rules.maxDailyLossPercent.toFixed(2)}%`}
            />
            <RiskCell
              label="Est. Reward"
              value={formatCurrency(risk.estimatedReward)}
              tone="emerald"
            />
            <RiskCell
              label="Reward : Risk"
              value={formatRatio(risk.rewardRiskRatio)}
              valueClassName={ratioTone}
            />
          </div>
        </div>

        {isApproved ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-sm font-semibold text-emerald-300">
                All {results.length} rules passed
              </span>
              <span className="text-xs text-emerald-300/80">
                You are cleared to proceed manually.
              </span>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((r) => {
              const isFail = r.status === "fail";
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5",
                    isFail
                      ? "border-rose-500/30 bg-rose-500/[0.06]"
                      : "border-amber-500/30 bg-amber-500/[0.06]",
                  )}
                >
                  {isFail ? (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  )}
                  <div className="flex flex-1 flex-col gap-1 leading-tight">
                    <span className="text-sm font-semibold text-foreground">
                      {r.label}
                    </span>
                    {r.message ? (
                      <span className="text-xs text-muted-foreground">
                        {r.message}
                      </span>
                    ) : null}
                    {r.recommendedAction ? (
                      <span className="text-xs text-foreground/80">
                        <span className="font-semibold uppercase tracking-[0.14em] text-[0.6rem] text-muted-foreground">
                          Recommended ·{" "}
                        </span>
                        {r.recommendedAction}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="-mx-5 -mb-5 flex flex-col gap-2 rounded-b-xl border-t border-white/10 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-end">
          {isApproved ? (
            <>
              <button
                type="button"
                onClick={onReviseTrade}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-background/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
              >
                <RotateCcw className="size-4" />
                Revise Trade
              </button>
              <button
                type="button"
                onClick={onConfirmApproval}
                className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15"
              >
                <ShieldCheck className="size-4" />
                Confirm Trade Plan
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancelTrade}
                className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
              >
                <XCircle className="size-4" />
                Cancel Trade
              </button>
              <button
                type="button"
                onClick={onReviseTrade}
                className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-background/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
              >
                <RotateCcw className="size-4" />
                Revise Trade
              </button>
              <button
                type="button"
                onClick={onContinueAnyway}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                  hasFail
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    : "border-brand/40 bg-brand/10 text-brand hover:bg-brand/15",
                )}
              >
                Continue Anyway
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RiskCell({
  label,
  value,
  tone = "default",
  valueClassName,
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "rose" | "emerald";
  valueClassName?: string;
  hint?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-400"
      : tone === "emerald"
        ? "text-emerald-400"
        : "text-foreground";
  return (
    <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-background/30 px-2.5 py-2">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums leading-none",
          valueClassName ?? toneClass,
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground/80">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
