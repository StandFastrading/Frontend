import { ShieldCheck } from "lucide-react";

export function RulesRiskHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Rules &amp; Risk
      </h1>
      <p className="text-sm text-muted-foreground">
        Define your trading rules, risk limits, and behavioral protections
        before entering the market.
      </p>
    </div>
  );
}

export function PreSessionCard() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-brand/30 bg-brand/[0.06] p-4 backdrop-blur sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/30">
        <ShieldCheck className="size-5" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          Pre-Session Review
        </span>
        <p className="text-xs text-muted-foreground">
          Update account size, protections, and trading rules before starting
          your session.
        </p>
      </div>
    </div>
  );
}
