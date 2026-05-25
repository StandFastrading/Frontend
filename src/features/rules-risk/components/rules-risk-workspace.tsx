"use client";

import { useEffect, useState } from "react";
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
import {
  DEFAULT_RISK_RULES,
  loadRiskRules,
  saveRiskRules,
} from "@/features/rules-risk/storage";
import type { RiskRulesConfig } from "@/features/rules-risk/types";

export function RulesRiskWorkspace() {
  // Saved snapshot drives the "unsaved changes" indicator; draft is what the
  // user is currently editing. Hydrating from localStorage in a post-mount
  // effect (instead of a lazy useState initializer) is intentional — the
  // alternatives would render the server snapshot, then differ on the client,
  // causing a hydration mismatch when saved data exists.
  const [saved, setSaved] = useState<RiskRulesConfig>(DEFAULT_RISK_RULES);
  const [draft, setDraft] = useState<RiskRulesConfig>(DEFAULT_RISK_RULES);

  useEffect(() => {
    const loaded = loadRiskRules();
    /* eslint-disable react-hooks/set-state-in-effect */
    setSaved(loaded);
    setDraft(loaded);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  const patchAccount = (patch: Partial<RiskRulesConfig["account"]>) =>
    setDraft((d) => ({ ...d, account: { ...d.account, ...patch } }));
  const patchPerTrade = (patch: Partial<RiskRulesConfig["perTrade"]>) =>
    setDraft((d) => ({ ...d, perTrade: { ...d.perTrade, ...patch } }));
  const patchDaily = (patch: Partial<RiskRulesConfig["daily"]>) =>
    setDraft((d) => ({ ...d, daily: { ...d.daily, ...patch } }));
  const patchBehavior = (patch: Partial<RiskRulesConfig["behavior"]>) =>
    setDraft((d) => ({ ...d, behavior: { ...d.behavior, ...patch } }));
  const patchIntervention = (
    patch: Partial<RiskRulesConfig["intervention"]>,
  ) =>
    setDraft((d) => ({ ...d, intervention: { ...d.intervention, ...patch } }));
  const setAllowedSetups = (next: string[]) =>
    setDraft((d) => ({ ...d, allowedSetups: next }));

  const handleSave = () => {
    const next: RiskRulesConfig = {
      ...draft,
      lastUpdated: new Date().toISOString(),
    };
    saveRiskRules(next);
    setSaved(next);
    setDraft(next);
    toast.success("Rules & Risk settings saved");
  };

  const handleReset = () => {
    setDraft(DEFAULT_RISK_RULES);
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
            value={draft.account}
            onChange={patchAccount}
            lastUpdated={saved.lastUpdated}
          />
          <PerTradeRulesSection
            value={draft.perTrade}
            onChange={patchPerTrade}
          />
          <AllowedSetupsSection
            value={draft.allowedSetups}
            onChange={setAllowedSetups}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <DailyProtectionSection
            value={draft.daily}
            onChange={patchDaily}
          />
          <BehaviorRulesSection
            value={draft.behavior}
            onChange={patchBehavior}
          />
          <InterventionPrefsSection
            value={draft.intervention}
            onChange={patchIntervention}
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
