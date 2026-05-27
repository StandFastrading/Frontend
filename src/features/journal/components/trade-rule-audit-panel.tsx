import { Check, CircleSlash, MinusCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AuditCheckStatus,
  RuleAuditResult,
} from "@/lib/journal/trade-rule-audit";

// SECTION 4 — Rule Adherence Audit
//
// Renders the audit checks from the rule-audit engine. Visual language
// is intentionally NOT spreadsheet-y — each check sits on its own row
// with a status icon + tone + a short explanation.

const STATUS_ICON = {
  pass: Check,
  fail: X,
  caution: CircleSlash,
  unavailable: MinusCircle,
} as const;

const STATUS_TONE: Record<AuditCheckStatus, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  fail: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  caution: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  unavailable: "bg-foreground/[0.05] text-muted-foreground ring-white/10",
};

const STATUS_LABEL: Record<AuditCheckStatus, string> = {
  pass: "Honored",
  fail: "Broken",
  caution: "With caveats",
  unavailable: "Unavailable",
};

export function TradeRuleAuditPanel({ audit }: { audit: RuleAuditResult }) {
  return (
    <section
      aria-label="Rule adherence audit"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/40 p-5 backdrop-blur"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Rule Adherence Audit
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          <span className="text-emerald-300">{audit.passCount} honored</span>
          {audit.cautionCount > 0 ? (
            <>
              {" · "}
              <span className="text-amber-300">
                {audit.cautionCount} with caveats
              </span>
            </>
          ) : null}
          {audit.failCount > 0 ? (
            <>
              {" · "}
              <span className="text-rose-300">{audit.failCount} broken</span>
            </>
          ) : null}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {audit.checks.map((check) => {
          const Icon = STATUS_ICON[check.status];
          return (
            <li
              key={check.id}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-background/20 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
                  STATUS_TONE[check.status],
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5 leading-tight">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-sm font-medium text-foreground">
                    {check.label}
                  </span>
                  <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/70">
                    {STATUS_LABEL[check.status]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {check.detail}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
