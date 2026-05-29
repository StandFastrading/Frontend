import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react";

import type { RuleCheckResult, RuleStatus } from "@/features/desk/types";
import { cn } from "@/lib/utils";

type Props = {
  results: RuleCheckResult[];
  checked: boolean;
};

const STATUS_META: Record<
  RuleStatus,
  {
    label: string;
    iconClass: string;
    chipClass: string;
    rowClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  pass: {
    label: "Pass",
    iconClass: "text-emerald-400",
    chipClass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    rowClass: "border-emerald-500/20 bg-emerald-500/[0.04]",
    Icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    iconClass: "text-amber-400",
    chipClass: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    rowClass: "border-amber-500/30 bg-amber-500/[0.05]",
    Icon: AlertTriangle,
  },
  fail: {
    label: "Fail",
    iconClass: "text-rose-400",
    chipClass: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    rowClass: "border-rose-500/30 bg-rose-500/[0.05]",
    Icon: XCircle,
  },
  "not-checked": {
    label: "—",
    iconClass: "text-muted-foreground",
    chipClass: "bg-foreground/5 text-muted-foreground ring-white/10",
    rowClass: "border-white/10 bg-background/30",
    Icon: Circle,
  },
};

// Compact rule check surface. The full rule reasoning is still rendered in
// the RuleCheckModal after Check Trade — this card is the at-a-glance
// summary that sits between the trade plan and the action buttons. It must
// stay short enough that Check Trade is visible without scrolling on a
// typical 1080p viewport, so:
//   - status pills replace verbose row chrome
//   - per-rule messages move to a `title` tooltip + the modal
//   - rules render in a 2-column grid on lg+ so 10 checks fit in ~5 rows
export function RuleCheckCard({ results, checked }: Props) {
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warning").length;
  const allPass = checked && passCount === results.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Rule Check
        </span>
        <div className="flex items-center gap-2">
          {checked ? (
            <>
              <SummaryPill tone="pass" label={`${passCount} pass`} />
              {warnCount > 0 ? (
                <SummaryPill tone="warning" label={`${warnCount} warn`} />
              ) : null}
              {failCount > 0 ? (
                <SummaryPill tone="fail" label={`${failCount} fail`} />
              ) : null}
            </>
          ) : (
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Awaiting Check
            </span>
          )}
        </div>
      </div>

      {allPass ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            Trade matches your rules — cleared to proceed.
          </span>
        </div>
      ) : null}

      <ul className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
        {results.map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.Icon;
          return (
            <li
              key={r.id}
              title={r.message ?? undefined}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
                meta.rowClass,
              )}
            >
              <Icon className={cn("size-3.5 shrink-0", meta.iconClass)} />
              <span className="flex-1 truncate text-xs font-medium text-foreground">
                {r.label}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] ring-1",
                  meta.chipClass,
                )}
              >
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryPill({
  tone,
  label,
}: {
  tone: Exclude<RuleStatus, "not-checked">;
  label: string;
}) {
  const meta = STATUS_META[tone];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ring-1",
        meta.chipClass,
      )}
    >
      {label}
    </span>
  );
}
