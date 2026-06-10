"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARKET_OPTIONS } from "@/features/desk/mock-data";
import type {
  Direction,
  MarketType,
  TradeInput,
} from "@/features/desk/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

// "Other / Custom" is always offered so traders can log off-script trades.
// It is intentionally not part of allowedSetups (even if you onboarded with
// it) so it trips the "Setup not in approved list" warning in
// trade-validation-engine.ts — that warning is the whole point.
const OTHER_CUSTOM = "Other / Custom";

type Props = {
  input: TradeInput;
  onChange: (patch: Partial<TradeInput>) => void;
};

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// Native <option> ignores most CSS in dark mode — browsers fall back to system
// colors for the popup, so options inherit the white `text-foreground` of the
// select against a light system background ("white on white"). Forcing
// concrete colors keeps them readable regardless of OS theme.
const OPTION_STYLE: React.CSSProperties = {
  backgroundColor: "oklch(0.205 0 0)",
  color: "oklch(0.985 0 0)",
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function valueOrEmpty(value: number | null): string {
  return value == null ? "" : String(value);
}

export function TradePlanCard({ input, onChange }: Props) {
  const allowedSetups = useAppStore((s) => s.riskRules.allowedSetups);
  const setupOptions = [
    ...allowedSetups.filter((s) => s !== OTHER_CUSTOM),
    OTHER_CUSTOM,
  ];

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Trade Plan Input
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Manual Entry
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Symbol / Ticker">
          <Input
            value={input.symbol}
            onChange={(e) =>
              onChange({ symbol: e.target.value.toUpperCase() })
            }
            placeholder="e.g. AAPL"
            autoComplete="off"
          />
        </Field>

        <Field label="Market Type">
          <select
            value={input.marketType}
            onChange={(e) =>
              onChange({ marketType: e.target.value as MarketType })
            }
            className={selectClass}
          >
            {MARKET_OPTIONS.map((m) => (
              <option key={m} value={m} style={OPTION_STYLE}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Direction">
          <div className="flex gap-2">
            {(["Long", "Short"] as Direction[]).map((d) => {
              const active = input.direction === d;
              const activeClasses =
                d === "Long"
                  ? "border-emerald-500/65 bg-emerald-500/20 text-emerald-200 shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]"
                  : "border-rose-500/65 bg-rose-500/20 text-rose-200 shadow-[0_0_18px_-4px_rgba(244,63,94,0.55)]";
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ direction: d })}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? activeClasses
                      : "border-input bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Position Size">
          <Input
            inputMode="decimal"
            value={valueOrEmpty(input.positionSize)}
            onChange={(e) =>
              onChange({ positionSize: numberOrNull(e.target.value) })
            }
            placeholder="Shares / contracts"
          />
        </Field>

        <Field label="Entry Price">
          <Input
            type="text"
            inputMode="decimal"
            value={input.entryPrice}
            onChange={(e) => onChange({ entryPrice: e.target.value })}
            placeholder="0.00"
          />
        </Field>

        <Field label="Stop Price">
          <Input
            type="text"
            inputMode="decimal"
            value={input.stopPrice}
            onChange={(e) => onChange({ stopPrice: e.target.value })}
            placeholder="0.00"
          />
        </Field>

        <Field label="Target Price">
          <Input
            type="text"
            inputMode="decimal"
            value={input.targetPrice}
            onChange={(e) => onChange({ targetPrice: e.target.value })}
            placeholder="0.00"
          />
        </Field>

        <Field label="Setup Type">
          <select
            value={input.setupType}
            onChange={(e) => onChange({ setupType: e.target.value })}
            className={selectClass}
          >
            <option value="" style={OPTION_STYLE}>
              Select setup…
            </option>
            {setupOptions.map((s) => (
              <option key={s} value={s} style={OPTION_STYLE}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Trade Plan / Reason for Trade">
        <textarea
          value={input.tradePlan}
          onChange={(e) => onChange({ tradePlan: e.target.value })}
          placeholder="What is the setup, the trigger, and what would invalidate it?"
          rows={4}
          className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
