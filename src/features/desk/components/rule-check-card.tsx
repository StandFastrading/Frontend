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
    label: "Not Checked",
    iconClass: "text-muted-foreground",
    chipClass: "bg-foreground/5 text-muted-foreground ring-white/10",
    rowClass: "border-white/10 bg-background/30",
    Icon: Circle,
  },
};

export function RuleCheckCard({ results, checked }: Props) {
  const passCount = results.filter((r) => r.status === "pass").length;
  const allPass = checked && passCount === results.length;

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Rule Check
        </span>
        <span
          className={cn(
            "text-[0.65rem] font-semibold uppercase tracking-[0.18em]",
            checked ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {checked ? `${passCount} / ${results.length} Passed` : "Awaiting Check"}
        </span>
      </div>

      {allPass ? (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-sm font-semibold text-emerald-300">
              Trade matches your rules
            </span>
            <span className="text-xs text-emerald-300/80">
              You are cleared to proceed manually.
            </span>
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {results.map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.Icon;
          return (
            <li
              key={r.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                meta.rowClass,
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", meta.iconClass)} />
              <div className="flex flex-1 flex-col gap-0.5 leading-tight">
                <span className="text-sm font-medium text-foreground">
                  {r.label}
                </span>
                {r.message ? (
                  <span className="text-xs text-muted-foreground">
                    {r.message}
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ring-1",
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
