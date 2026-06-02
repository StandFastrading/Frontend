"use client";

import { Info } from "lucide-react";

import {
  Field,
  NumericInput,
  OPTION_STYLE,
  SectionCard,
  SELECT_CLASS,
} from "@/features/rules-risk/components/controls";
import type {
  AccountCurrency,
  AccountSettings,
  AccountType,
} from "@/features/rules-risk/types";

const ACCOUNT_TYPES: AccountType[] = ["Cash", "Margin", "Futures", "Crypto"];
const CURRENCIES: AccountCurrency[] = ["USD", "EUR", "GBP", "CAD"];

const CURRENCY_SYMBOL: Record<AccountCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "$",
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Not yet saved";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value: number, symbol: string): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSigned(value: number, symbol: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AccountRiskSection({
  value,
  onChange,
  lastUpdated,
  realizedPnLToday,
}: {
  value: AccountSettings;
  onChange: (patch: Partial<AccountSettings>) => void;
  lastUpdated: string | null;
  // Sum of realized P/L for trades closed today (sourced from the
  // closed-trades archive in the workspace). Used to derive Current
  // Balance for the display strip + Live Risk Preview. Stays as a
  // prop — the section stays presentational.
  realizedPnLToday: number;
}) {
  const symbol = CURRENCY_SYMBOL[value.currency];
  const accountSizeUnset = value.accountSize <= 0;
  // Current Balance = Starting Balance + Realized P/L Today. This is
  // the divisor Trade Desk uses for next-trade risk %, so the preview
  // here matches what the trader sees on the Check Trade modal.
  const currentBalance = value.accountSize + realizedPnLToday;
  const livePreviewRisk =
    currentBalance > 0
      ? (currentBalance * value.baseRiskPerTradePercent) / 100
      : 0;
  const realizedPnLTone =
    realizedPnLToday > 0
      ? "text-emerald-300"
      : realizedPnLToday < 0
        ? "text-rose-300"
        : "text-foreground";

  return (
    <SectionCard
      title="Account & Risk"
      rightSlot={
        <span className="text-[0.65rem] text-muted-foreground">
          Last Updated · {formatTimestamp(lastUpdated)}
        </span>
      }
    >
      {accountSizeUnset ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-sm font-semibold text-amber-200">
              Account size not set
            </span>
            <span className="text-xs text-amber-200/80">
              Complete onboarding or update your trading profile.
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Starting Balance">
          <NumericInput
            allowDecimal
            value={value.accountSize}
            onChange={(n) => onChange({ accountSize: n })}
            placeholder="30000"
          />
        </Field>

        <Field label="Base Risk Per Trade (%)">
          <NumericInput
            allowDecimal
            value={value.baseRiskPerTradePercent}
            onChange={(n) => onChange({ baseRiskPerTradePercent: n })}
            placeholder="1.0"
          />
        </Field>

        <Field label="Max Dollar Risk Per Trade">
          <NumericInput
            allowDecimal
            value={value.maxDollarRiskPerTrade}
            onChange={(n) => onChange({ maxDollarRiskPerTrade: n })}
            placeholder="300"
          />
        </Field>

        <Field label="Account Type">
          <select
            value={value.accountType}
            onChange={(e) =>
              onChange({ accountType: e.target.value as AccountType })
            }
            className={SELECT_CLASS}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t} style={OPTION_STYLE}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Account Currency">
          <select
            value={value.currency}
            onChange={(e) =>
              onChange({ currency: e.target.value as AccountCurrency })
            }
            className={SELECT_CLASS}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} style={OPTION_STYLE}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {accountSizeUnset ? null : (
        <div className="flex flex-col gap-3">
          {/* Balance breakdown — surfaces the distinction between the
              fixed session baseline and the trader's live capital. The
              Live Risk Preview below uses Current Balance, so this
              strip makes the math the preview is doing visible. */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-background/30 p-3 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Starting Balance
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(value.accountSize, symbol)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Realized P/L Today
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${realizedPnLTone}`}
              >
                {formatSigned(realizedPnLToday, symbol)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Current Balance
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(currentBalance, symbol)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Live Risk Preview
              </span>
              <span className="text-xs text-muted-foreground">
                {value.baseRiskPerTradePercent.toFixed(2)}% of Current Balance{" "}
                {formatMoney(currentBalance, symbol)}
              </span>
            </div>
            <span className="text-lg font-semibold tabular-nums text-emerald-300">
              {symbol}
              {livePreviewRisk.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
