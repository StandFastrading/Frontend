import type { RiskRules } from "@/types";
import { getDefaultRiskRules } from "@/types";
import type { SliceCreator } from "@/store/types";

// Risk rules slice owns the trader's configured limits. Rules & Risk page is
// the editor; Trade Desk is a read-only consumer. The validation engine
// reads rules directly via `useAppStore.getState()` inside thunk actions.

export type RiskRulesSlice = {
  riskRules: RiskRules;
  saveRiskRules: (next: RiskRules) => void;
  // Narrow setter used by onboarding (and any other isolated field-level
  // writer) so callers don't have to round-trip through the full RiskRules
  // record. Stamps `updatedAt` so the Risk Rules page's "last updated"
  // signal and the "is this set yet" check both update in lockstep with a
  // real edit. accountSize remains the single source of truth on
  // `riskRules` — this just exposes a typed write path to it.
  setAccountSize: (amount: number) => void;
  resetRiskRules: () => void;
};

export const createRiskRulesSlice: SliceCreator<RiskRulesSlice> = (set) => ({
  riskRules: getDefaultRiskRules(),
  saveRiskRules: (next) =>
    set(() => ({
      riskRules: { ...next, updatedAt: new Date().toISOString() },
    })),
  setAccountSize: (amount) =>
    set((state) => ({
      riskRules: {
        ...state.riskRules,
        accountSize: amount,
        updatedAt: new Date().toISOString(),
      },
    })),
  resetRiskRules: () => set(() => ({ riskRules: getDefaultRiskRules() })),
});
