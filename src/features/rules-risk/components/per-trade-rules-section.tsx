"use client";

import {
  Field,
  NumericInput,
  SectionCard,
  Toggle,
} from "@/features/rules-risk/components/controls";
import type { PerTradeRules } from "@/features/rules-risk/types";

export function PerTradeRulesSection({
  value,
  onChange,
}: {
  value: PerTradeRules;
  onChange: (patch: Partial<PerTradeRules>) => void;
}) {
  return (
    <SectionCard title="Per Trade Rules">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Minimum Reward : Risk">
          <NumericInput
            allowDecimal
            value={value.minRewardRiskRatio}
            onChange={(n) => onChange({ minRewardRiskRatio: n })}
            placeholder="2.0"
          />
        </Field>

        <Field label="Max Position Size">
          <NumericInput
            value={value.maxPositionSize}
            onChange={(n) => onChange({ maxPositionSize: n })}
            placeholder="1000"
          />
        </Field>

        <Field label="Max Adds Per Trade">
          <NumericInput
            value={value.maxAddsPerTrade}
            onChange={(n) => onChange({ maxAddsPerTrade: n })}
            placeholder="1"
          />
        </Field>

        <Field label="Max Open Positions">
          <NumericInput
            value={value.maxOpenPositions}
            onChange={(n) => onChange({ maxOpenPositions: n })}
            placeholder="3"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          checked={value.requireStopLoss}
          onChange={(v) => onChange({ requireStopLoss: v })}
          label="Require Stop Loss"
          description="Trades without a stop trigger a critical warning and cannot receive approval within StandFast."
        />
        <Toggle
          checked={value.noAveragingDown}
          onChange={(v) => onChange({ noAveragingDown: v })}
          label="No Averaging Down"
          description="Warn against adding to losing positions."
        />
        <Toggle
          checked={value.setupMustBeApproved}
          onChange={(v) => onChange({ setupMustBeApproved: v })}
          label="Setup Must Be Approved"
          description="Trades using unapproved setups trigger elevated warnings."
        />
      </div>
    </SectionCard>
  );
}
