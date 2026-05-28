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

export function AccountRiskSection({
  value,
  onChange,
  lastUpdated,
}: {
  value: AccountSettings;
  onChange: (patch: Partial<AccountSettings>) => void;
  lastUpdated: string | null;
}) {
  const symbol = CURRENCY_SYMBOL[value.currency];
  const accountSizeUnset = value.accountSize <= 0;
  const livePreviewRisk =
    value.accountSize > 0
      ? (value.accountSize * value.baseRiskPerTradePercent) / 100
      : 0;

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
        <Field label="Current Account Size">
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
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Live Risk Preview
            </span>
            <span className="text-xs text-muted-foreground">
              {value.baseRiskPerTradePercent.toFixed(2)}% of {symbol}
              {value.accountSize.toLocaleString("en-US")}
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
      )}
    </SectionCard>
  );
}
