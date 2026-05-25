"use client";

import {
  Field,
  SectionCard,
  Toggle,
} from "@/features/rules-risk/components/controls";
import type {
  InterventionPreferences,
  WarningLevel,
} from "@/features/rules-risk/types";
import { cn } from "@/lib/utils";

const WARNING_LEVELS: Array<{
  value: WarningLevel;
  label: string;
  description: string;
}> = [
  { value: "soft", label: "Soft", description: "Gentle prompts only" },
  {
    value: "standard",
    label: "Standard",
    description: "Modal with override options",
  },
  {
    value: "strict",
    label: "Strict",
    description: "Confirmation + reflection required",
  },
  {
    value: "hard_lock",
    label: "Hard Lock",
    description: "Prevents trade approval within StandFast.",
  },
];

export function InterventionPrefsSection({
  value,
  onChange,
}: {
  value: InterventionPreferences;
  onChange: (patch: Partial<InterventionPreferences>) => void;
}) {
  return (
    <SectionCard title="Intervention Preferences">
      <Field label="Warning Level">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WARNING_LEVELS.map((opt) => {
            const active = value.warningLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ warningLevel: opt.value })}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-brand/50 bg-brand/[0.10] text-brand"
                    : "border-white/10 bg-background/30 text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                <span className="text-xs font-semibold">{opt.label}</span>
                <span
                  className={cn(
                    "text-[0.65rem] leading-snug",
                    active ? "text-brand/80" : "text-muted-foreground",
                  )}
                >
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <Toggle
          checked={value.requireConfirmationBeforeOverride}
          onChange={(v) => onChange({ requireConfirmationBeforeOverride: v })}
          label="Require Confirmation Before Override"
          description="Trader must explicitly confirm before continuing past a warning."
        />
        <Toggle
          checked={value.reflectionPromptAfterOverride}
          onChange={(v) => onChange({ reflectionPromptAfterOverride: v })}
          label="Reflection Prompt After Override"
          description="Capture a short note explaining why the warning was ignored."
        />
      </div>
    </SectionCard>
  );
}
