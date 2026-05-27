"use client";

import {
  Field,
  NumericInput,
  SectionCard,
  Toggle,
} from "@/features/rules-risk/components/controls";
import type { DailyProtectionRules } from "@/features/rules-risk/types";

export function DailyProtectionSection({
  value,
  onChange,
}: {
  value: DailyProtectionRules;
  onChange: (patch: Partial<DailyProtectionRules>) => void;
}) {
  return (
    <SectionCard title="Daily Protection Rules">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Max Daily Loss (%)">
          <NumericInput
            allowDecimal
            value={value.maxDailyLossPercent}
            onChange={(n) => onChange({ maxDailyLossPercent: n })}
            placeholder="4"
          />
        </Field>

        <Field label="Max Daily Trades">
          <NumericInput
            value={value.maxDailyTrades}
            onChange={(n) => onChange({ maxDailyTrades: n })}
            placeholder="5"
          />
        </Field>

        <Field label="Max Red Trades">
          <NumericInput
            value={value.maxRedTrades}
            onChange={(n) => onChange({ maxRedTrades: n })}
            placeholder="3"
          />
        </Field>

        <Field label="Max Consecutive Losses">
          <NumericInput
            value={value.maxConsecutiveLosses}
            onChange={(n) => onChange({ maxConsecutiveLosses: n })}
            placeholder="3"
          />
        </Field>

        <Field label="Cooldown After Loss (min)">
          <NumericInput
            value={value.cooldownAfterLossMinutes}
            onChange={(n) => onChange({ cooldownAfterLossMinutes: n })}
            placeholder="15"
          />
        </Field>
      </div>

      <Toggle
        checked={value.lockoutAfterMaxLoss}
        onChange={(v) => onChange({ lockoutAfterMaxLoss: v })}
        label="Lockout After Max Loss"
        description="Withhold trade approval for the rest of the session once the daily loss limit is hit."
      />
    </SectionCard>
  );
}
