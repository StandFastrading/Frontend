import type { RiskRules } from "@/types";
import { getDefaultRiskRules } from "@/types";
import type { SliceCreator } from "@/store/types";

// Risk rules slice owns the trader's configured limits. Rules & Risk page is
// the editor; Trade Desk is a read-only consumer. The validation engine
// reads rules directly via `useAppStore.getState()` inside thunk actions.

export type RiskRulesSlice = {
  riskRules: RiskRules;
  saveRiskRules: (next: RiskRules) => void;
  resetRiskRules: () => void;
};

export const createRiskRulesSlice: SliceCreator<RiskRulesSlice> = (set) => ({
  riskRules: getDefaultRiskRules(),
  saveRiskRules: (next) =>
    set(() => ({
      riskRules: { ...next, updatedAt: new Date().toISOString() },
    })),
  resetRiskRules: () => set(() => ({ riskRules: getDefaultRiskRules() })),
});
