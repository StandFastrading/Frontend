import { ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { EXIT_REASON_LABEL, type ClosedTrade } from "@/types";

// SECTION 1 — Trade Overview
//
// Core trade record fields. P/L is visually secondary per the product
// principle — surfaced but never colored as the dominant signal.

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatR(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(activatedAt: string, closedAt: string): string {
  const a = new Date(activatedAt).getTime();
  const c = new Date(closedAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(c) || c < a) return "—";
  const minutes = Math.round((c - a) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function Field({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium leading-tight tabular-nums",
          tone === "muted" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TradeDetailOverview({ trade }: { trade: ClosedTrade }) {
  const isLong = trade.direction === "Long";
  const DirIcon = isLong ? ArrowUpRight : ArrowDownRight;
  const dirTone = isLong
    ? "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30"
    : "text-rose-300 bg-rose-500/15 ring-rose-500/30";

  return (
    <section
      aria-label="Trade overview"
      className="rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg ring-1",
              dirTone,
            )}
          >
            <DirIcon className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground">
                {trade.symbol}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                {trade.direction} · {trade.marketType}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {trade.setupType || "No setup tagged"} · Closed{" "}
              {formatDateTime(trade.closedAt)}
            </span>
          </div>
        </div>
        <span className="rounded-full bg-foreground/[0.05] px-2.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-foreground/85 ring-1 ring-white/10">
          {trade.outcome}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Entry" value={formatPrice(trade.entryPrice)} />
        <Field label="Exit" value={formatPrice(trade.exitPrice)} />
        <Field label="Position Size" value={trade.positionSize.toLocaleString("en-US")} />
        <Field
          label="Original Risk"
          value={
            trade.originalRisk != null
              ? `$${trade.originalRisk.toFixed(2)}`
              : "—"
          }
        />
        <Field label="Realized R" value={formatR(trade.realizedR)} />
        <Field
          label="Duration"
          value={formatDuration(trade.activatedAt, trade.closedAt)}
          tone="muted"
        />
      </div>

      {/* P/L row — secondary, muted. Behavior leads; P/L is informational. */}
      <div className="mt-4 flex items-baseline justify-between border-t border-white/5 pt-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.18em]">
          P/L (informational only)
        </span>
        <span className="font-medium tabular-nums text-foreground/75">
          {formatPnL(trade.realizedPnL)}
        </span>
      </div>

      {/* Exit Reason — structured pick captured at Log Exit. Older
          archive rows pre-date the field; hidden when null so they
          render unchanged. */}
      {trade.exitReason ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Exit Reason
          </span>
          <span className="text-sm font-medium text-foreground">
            {EXIT_REASON_LABEL[trade.exitReason]}
          </span>
          {trade.exitNotes && trade.exitNotes.trim().length > 0 ? (
            <p className="text-xs leading-relaxed text-foreground/80">
              {trade.exitNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Risk reduction attribution — only rendered when logExit
          computed savings against the originally-planned stop. Shows
          the planned-vs-actual diff so the trader sees the concrete
          defensive win, not just an abstract "good behavior" tag. */}
      {trade.lossReduced &&
      trade.lossReductionAmount != null &&
      trade.lossReductionPercent != null ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/[0.06] p-3 shadow-[0_0_24px_-10px_rgba(16,185,129,0.55)]">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35">
            <ShieldCheck className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
              Risk Reduction
            </span>
            <span className="text-sm text-foreground/90">
              Loss reduced by{" "}
              <span className="font-semibold tabular-nums text-emerald-300">
                {Math.round(trade.lossReductionPercent * 100)}%
              </span>{" "}
              ({"-$"}
              {trade.lossReductionAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              saved) compared to the planned stop.
            </span>
          </div>
        </div>
      ) : null}

      {/* Inline exit reflection — the in-the-moment thought captured at
          close. Distinct from the structured Trade Reflection below it. */}
      {trade.exitReflection && trade.exitReflection.trim().length > 0 ? (
        <div className="mt-3 flex flex-col gap-1 border-t border-white/5 pt-3">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Exit thought
          </span>
          <p className="text-xs leading-relaxed text-foreground/85">
            &ldquo;{trade.exitReflection}&rdquo;
          </p>
        </div>
      ) : null}
    </section>
  );
}
