import { enqueueSync, riskRulesMapper } from "@/lib/sync";
import type { RiskRules } from "@/types";
import { getDefaultRiskRules } from "@/types";
import type { SliceCreator } from "@/store/types";

// Risk rules slice owns the trader's configured limits. Rules & Risk page is
// the editor; Trade Desk is a read-only consumer. The validation engine
// reads rules directly via `useAppStore.getState()` inside thunk actions.
//
// Server sync: every mutation upserts into the `risk_rules` table keyed on
// the user_id (one row per user). UPSERT semantics so we don't have to
// distinguish "create" from "update" — the row exists from signup-time via
// the handle_new_user() auth trigger.

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

function syncRiskRules(rules: RiskRules, userId: string | null) {
  if (!userId) return;
  enqueueSync({
    table: "risk_rules",
    op: "upsert",
    payload: riskRulesMapper.toUpsert(rules, userId),
    onConflict: "user_id",
  });
}

export const createRiskRulesSlice: SliceCreator<RiskRulesSlice> = (
  set,
  get,
) => ({
  riskRules: getDefaultRiskRules(),
  saveRiskRules: (next) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    set(() => ({ riskRules: stamped }));
    syncRiskRules(stamped, get().userId);
  },
  setAccountSize: (amount) => {
    const prev = get().riskRules;
    const stamped = {
      ...prev,
      accountSize: amount,
      updatedAt: new Date().toISOString(),
    };
    set(() => ({ riskRules: stamped }));
    syncRiskRules(stamped, get().userId);
  },
  resetRiskRules: () => set(() => ({ riskRules: getDefaultRiskRules() })),
});
