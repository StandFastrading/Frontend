"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AccountRiskSection } from "@/features/rules-risk/components/account-risk-section";
import { ActionBar } from "@/features/rules-risk/components/action-bar";
import { AllowedSetupsSection } from "@/features/rules-risk/components/allowed-setups-section";
import { BehaviorRulesSection } from "@/features/rules-risk/components/behavior-rules-section";
import { DailyProtectionSection } from "@/features/rules-risk/components/daily-protection-section";
import { InterventionPrefsSection } from "@/features/rules-risk/components/intervention-prefs-section";
import { PerTradeRulesSection } from "@/features/rules-risk/components/per-trade-rules-section";
import {
  PreSessionCard,
  RulesRiskHeader,
} from "@/features/rules-risk/components/rules-risk-header";
import type {
  AccountSettings,
  BehaviorRules,
  DailyProtectionRules,
  InterventionPreferences,
  PerTradeRules,
} from "@/features/rules-risk/types";
import type { RiskRules } from "@/types";
import { getDefaultRiskRules } from "@/types";
import { deriveRealizedPnLToday } from "@/lib/sessions/account-balance";
import { useAppStore } from "@/store";

// Section components still consume the legacy nested sub-shapes. The canonical
// state is the flat `RiskRules` record from @/types — we
// project nested views to the UI and merge patches back into the flat record
// on the way out. Lets us swap the storage layer once without touching any
// section component.

function toAccount(r: RiskRules): AccountSettings {
  return {
    accountSize: r.accountSize,
    baseRiskPerTradePercent: r.baseRiskPerTradePercent,
    maxDollarRiskPerTrade: r.maxDollarRiskPerTrade,
    accountType: r.accountType,
    currency: r.accountCurrency,
  };
}
function fromAccount(patch: Partial<AccountSettings>): Partial<RiskRules> {
  const out: Partial<RiskRules> = {};
  if (patch.accountSize !== undefined) out.accountSize = patch.accountSize;
  if (patch.baseRiskPerTradePercent !== undefined)
    out.baseRiskPerTradePercent = patch.baseRiskPerTradePercent;
  if (patch.maxDollarRiskPerTrade !== undefined)
    out.maxDollarRiskPerTrade = patch.maxDollarRiskPerTrade;
  if (patch.accountType !== undefined) out.accountType = patch.accountType;
  if (patch.currency !== undefined) out.accountCurrency = patch.currency;
  return out;
}

function toPerTrade(r: RiskRules): PerTradeRules {
  return {
    requireStopLoss: r.requireStopLoss,
    minRewardRiskRatio: r.minimumRewardRisk,
    maxPositionSize: r.maxPositionSize,
    maxAddsPerTrade: r.maxAddsPerTrade,
    noAveragingDown: r.noAveragingDown,
    maxOpenPositions: r.maxOpenPositions,
    setupMustBeApproved: r.setupMustBeApproved,
  };
}
function fromPerTrade(patch: Partial<PerTradeRules>): Partial<RiskRules> {
  const out: Partial<RiskRules> = {};
  if (patch.requireStopLoss !== undefined)
    out.requireStopLoss = patch.requireStopLoss;
  if (patch.minRewardRiskRatio !== undefined)
    out.minimumRewardRisk = patch.minRewardRiskRatio;
  if (patch.maxPositionSize !== undefined)
    out.maxPositionSize = patch.maxPositionSize;
  if (patch.maxAddsPerTrade !== undefined)
    out.maxAddsPerTrade = patch.maxAddsPerTrade;
  if (patch.noAveragingDown !== undefined)
    out.noAveragingDown = patch.noAveragingDown;
  if (patch.maxOpenPositions !== undefined)
    out.maxOpenPositions = patch.maxOpenPositions;
  if (patch.setupMustBeApproved !== undefined)
    out.setupMustBeApproved = patch.setupMustBeApproved;
  return out;
}

function toDaily(r: RiskRules): DailyProtectionRules {
  return {
    maxDailyLossPercent: r.maxDailyLossPercent,
    maxDailyTrades: r.maxDailyTrades,
    maxRedTrades: r.maxRedTrades,
    maxConsecutiveLosses: r.maxConsecutiveLosses,
    cooldownAfterLossMinutes: r.cooldownAfterLossMinutes,
    lockoutAfterMaxLoss: r.lockoutAfterMaxLoss,
  };
}
function fromDaily(patch: Partial<DailyProtectionRules>): Partial<RiskRules> {
  const out: Partial<RiskRules> = {};
  if (patch.maxDailyLossPercent !== undefined)
    out.maxDailyLossPercent = patch.maxDailyLossPercent;
  if (patch.maxDailyTrades !== undefined)
    out.maxDailyTrades = patch.maxDailyTrades;
  if (patch.maxRedTrades !== undefined) out.maxRedTrades = patch.maxRedTrades;
  if (patch.maxConsecutiveLosses !== undefined)
    out.maxConsecutiveLosses = patch.maxConsecutiveLosses;
  if (patch.cooldownAfterLossMinutes !== undefined)
    out.cooldownAfterLossMinutes = patch.cooldownAfterLossMinutes;
  if (patch.lockoutAfterMaxLoss !== undefined)
    out.lockoutAfterMaxLoss = patch.lockoutAfterMaxLoss;
  return out;
}

function toBehavior(r: RiskRules): BehaviorRules {
  return {
    noRevengeTrading: r.noRevengeTrading,
    noTradingAfterEmotionalWarning: r.noTradingAfterEmotionalWarning,
    noReentryWithinMinutes: r.noReentryWithinMinutes,
    noTradesOutsideAllowedSetups: r.noTradesOutsideAllowedSetups,
    noOvertrading: r.noOvertrading,
  };
}
function fromBehavior(patch: Partial<BehaviorRules>): Partial<RiskRules> {
  const out: Partial<RiskRules> = {};
  if (patch.noRevengeTrading !== undefined)
    out.noRevengeTrading = patch.noRevengeTrading;
  if (patch.noTradingAfterEmotionalWarning !== undefined)
    out.noTradingAfterEmotionalWarning = patch.noTradingAfterEmotionalWarning;
  if (patch.noReentryWithinMinutes !== undefined)
    out.noReentryWithinMinutes = patch.noReentryWithinMinutes;
  if (patch.noTradesOutsideAllowedSetups !== undefined)
    out.noTradesOutsideAllowedSetups = patch.noTradesOutsideAllowedSetups;
  if (patch.noOvertrading !== undefined) out.noOvertrading = patch.noOvertrading;
  return out;
}

function toIntervention(r: RiskRules): InterventionPreferences {
  return {
    warningLevel: r.warningLevel,
    requireConfirmationBeforeOverride: r.requireConfirmationBeforeOverride,
    reflectionPromptAfterOverride: r.reflectionPromptAfterOverride,
  };
}
function fromIntervention(
  patch: Partial<InterventionPreferences>,
): Partial<RiskRules> {
  const out: Partial<RiskRules> = {};
  if (patch.warningLevel !== undefined) out.warningLevel = patch.warningLevel;
  if (patch.requireConfirmationBeforeOverride !== undefined)
    out.requireConfirmationBeforeOverride =
      patch.requireConfirmationBeforeOverride;
  if (patch.reflectionPromptAfterOverride !== undefined)
    out.reflectionPromptAfterOverride = patch.reflectionPromptAfterOverride;
  return out;
}

export function RulesRiskWorkspace() {
  // Saved snapshot comes from the store; local `draft` is just the in-flight
  // edit buffer driving the form. On Save we commit the draft to the store
  // via `saveRiskRules` (the slice action stamps `updatedAt`).
  const saved = useAppStore((s) => s.riskRules);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const persistRules = useAppStore((s) => s.saveRiskRules);
  // Realized P/L from trades closed today — drives the Current Balance
  // derivation surfaced on the Account & Risk card. Source of truth is
  // the closed-trades archive; recomputed on read so the card always
  // matches what `pnLToday` shows on the dashboard.
  const closedTrades = useAppStore((s) => s.closedTrades);
  const realizedPnLToday = useMemo(
    () => deriveRealizedPnLToday(closedTrades),
    [closedTrades],
  );

  const [draft, setDraft] = useState<RiskRules>(saved);

  // Sync the draft to the store after rehydration so the form reflects the
  // user's actual saved rules instead of the default snapshot we initialized
  // with. After this, the draft diverges only on user edits.
  useEffect(() => {
    if (hasHydrated) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setDraft(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const dirty = useMemo(
    () => JSON.stringify(saved) !== JSON.stringify(draft),
    [saved, draft],
  );

  const patch = (partial: Partial<RiskRules>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const handleSave = () => {
    persistRules(draft);
    toast.success("Rules & Risk settings saved");
  };

  const handleReset = () => {
    setDraft(getDefaultRiskRules());
    toast.message("Defaults restored — click Save to persist");
  };

  return (
    <div className="flex flex-col gap-6">
      <RulesRiskHeader />
      <PreSessionCard />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <AccountRiskSection
            value={toAccount(draft)}
            onChange={(p) => patch(fromAccount(p))}
            lastUpdated={saved.updatedAt}
            realizedPnLToday={realizedPnLToday}
          />
          <PerTradeRulesSection
            value={toPerTrade(draft)}
            onChange={(p) => patch(fromPerTrade(p))}
          />
          <AllowedSetupsSection
            value={draft.allowedSetups}
            onChange={(next) => patch({ allowedSetups: next })}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <DailyProtectionSection
            value={toDaily(draft)}
            onChange={(p) => patch(fromDaily(p))}
          />
          <BehaviorRulesSection
            value={toBehavior(draft)}
            onChange={(p) => patch(fromBehavior(p))}
          />
          <InterventionPrefsSection
            value={toIntervention(draft)}
            onChange={(p) => patch(fromIntervention(p))}
          />
        </div>
      </div>

      <ActionBar
        dirty={dirty}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
