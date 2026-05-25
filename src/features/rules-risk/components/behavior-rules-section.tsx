"use client";

import {
  Field,
  NumericInput,
  SectionCard,
  Toggle,
} from "@/features/rules-risk/components/controls";
import type { BehaviorRules } from "@/features/rules-risk/types";

export function BehaviorRulesSection({
  value,
  onChange,
}: {
  value: BehaviorRules;
  onChange: (patch: Partial<BehaviorRules>) => void;
}) {
  return (
    <SectionCard title="Behavior Rules">
      <div className="flex flex-col gap-2">
        <Toggle
          checked={value.noRevengeTrading}
          onChange={(v) => onChange({ noRevengeTrading: v })}
          label="Elevated Intervention After Emotional Behavior"
          description="Increases intervention intensity after impulsive or emotionally driven behavior patterns are detected."
        />
        <Toggle
          checked={value.noTradingAfterEmotionalWarning}
          onChange={(v) => onChange({ noTradingAfterEmotionalWarning: v })}
          label="No Trading After Emotional Warning"
          description="Increase intervention intensity after behavioral-state warnings."
        />
        <Toggle
          checked={value.noTradesOutsideAllowedSetups}
          onChange={(v) => onChange({ noTradesOutsideAllowedSetups: v })}
          label="No Trades Outside Allowed Setups"
          description="Flag setups not on your approved setup list."
        />
        <Toggle
          checked={value.noOvertrading}
          onChange={(v) => onChange({ noOvertrading: v })}
          label="No Overtrading"
          description="Trigger warnings when the daily max-trades count is reached."
        />
      </div>

      <Field label="No Re-entry Within (minutes)">
        <NumericInput
          value={value.noReentryWithinMinutes}
          onChange={(n) => onChange({ noReentryWithinMinutes: n })}
          placeholder="15"
        />
      </Field>
    </SectionCard>
  );
}
