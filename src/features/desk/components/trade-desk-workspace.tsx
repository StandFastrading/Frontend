"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { UNCHECKED_RULES } from "@/lib/validation/trade-validation-engine";
import { useCurrentSessionEvents } from "@/lib/sessions/session-helpers";
import type { InterventionDecision } from "@/types";
import { useAppStore } from "@/store";
import { ActionButtons } from "@/features/desk/components/action-buttons";
import { ActiveTradePanel } from "@/features/desk/components/active-trade-panel";
import { BehaviorFeedPreview } from "@/features/desk/components/behavior-feed-preview";
// V1 beta: the Live Risk Preview panel is intentionally hidden so we capture
// the trader's pre-feedback intent before they self-correct share size in
// response to live risk numbers. The card + its math are still imported and
// the slice still computes risk — re-mount <RiskPreviewCard /> below when we
// want to reactivate it. Do not delete the import / file.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RiskPreviewCard } from "@/features/desk/components/risk-preview-card";
import { RuleCheckCard } from "@/features/desk/components/rule-check-card";
import { RuleCheckModal } from "@/features/desk/components/rule-check-modal";
import { StartNewSessionButton } from "@/features/desk/components/start-new-session-button";
import { TradePlanCard } from "@/features/desk/components/trade-plan-card";

// Page is purely presentational — every piece of state and every action
// lives in the centralized store. The component reads slices via selectors
// and dispatches by calling the slice's actions; no validation, no risk
// math, no event building happens here.

export function TradeDeskWorkspace() {
  const tradeInput = useAppStore((s) => s.tradeInput);
  const validation = useAppStore((s) => s.validation);
  const hasCheckedTrade = useAppStore((s) => s.hasCheckedTrade);
  const approvedSnapshot = useAppStore((s) => s.approvedSnapshot);
  const modalOpen = useAppStore((s) => s.modalOpen);
  const modalResults = useAppStore((s) => s.modalResults);
  const riskRules = useAppStore((s) => s.riskRules);
  // Behavior feed is session-scoped — historical events from prior
  // sessions stay archived but don't show up in today's feed.
  const sessionEvents = useCurrentSessionEvents();
  const hasHydrated = useAppStore((s) => s._hasHydrated);

  const patchTradeInput = useAppStore((s) => s.patchTradeInput);
  const clearTradeInput = useAppStore((s) => s.clearTradeInput);
  const recomputeValidation = useAppStore((s) => s.recomputeValidation);
  const checkTrade = useAppStore((s) => s.checkTrade);
  const markTradeAsActive = useAppStore((s) => s.markTradeAsActive);
  const recordInterventionDecision = useAppStore(
    (s) => s.recordInterventionDecision,
  );

  // Re-run validation once we're hydrated so live risk numbers pick up the
  // user's actual saved rules (vs. server-rendered defaults). Mock seed
  // events are gone — a fresh session starts with an empty feed that fills
  // in as the trader produces real events.
  useEffect(() => {
    if (!hasHydrated) return;
    recomputeValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const displayedRuleResults = hasCheckedTrade
    ? (validation?.ruleResults ?? UNCHECKED_RULES)
    : UNCHECKED_RULES;

  // Toast on the transition from "not yet approved" to "approved" so the
  // user gets feedback for every clean check, not just the first one.
  const lastApprovalTimestamp = validation?.canReceiveStandFastApproval
    ? validation.timestamp
    : null;
  useEffect(() => {
    if (lastApprovalTimestamp && hasCheckedTrade) {
      toast.success("Trade has StandFast approval");
    }
  }, [lastApprovalTimestamp, hasCheckedTrade]);

  const riskCalc = useMemo(
    () =>
      validation?.riskCalculation ?? {
        riskPerShare: null,
        totalRisk: null,
        estimatedReward: null,
        rewardRiskRatio: null,
        accountRiskPercent: null,
        projectedDailyRiskPercent: null,
      },
    [validation],
  );

  const handleIntervention = (decision: InterventionDecision) => {
    if (process.env.NODE_ENV === "development" && decision === "continue_anyway") {
      console.debug("[trade-desk] Continue Anyway clicked", {
        validationStatus: validation?.validationStatus,
        triggeredRuleCount: validation?.triggeredRules.length ?? 0,
      });
    }
    recordInterventionDecision(decision);
    if (decision === "continue_anyway") {
      // Both warning-only and fail-overrides now produce an activatable
      // snapshot — the toast just confirms the override pathway. The CTA
      // colors itself amber to signal the override visually.
      toast.warning("Trade override accepted — ready to mark active");
    } else if (decision === "cancel_trade") {
      toast.success("Trade canceled — setup preserved for revision");
    }
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved (local only — broker sync coming later)");
  };

  // Dev-only visibility audit — re-fires whenever the snapshot identity
  // changes (zustand returns a new object only on real state change).
  // Surfaces the inputs so we can verify the gate is being hit for both
  // warning-only and fail-override cases.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[trade-desk] Mark Trade as Active visibility", {
      canMarkActive: approvedSnapshot != null,
      approvalStatus: approvedSnapshot?.approvalStatus ?? null,
      overrideAccepted: approvedSnapshot?.overrideAccepted ?? false,
      missingStop: approvedSnapshot?.stopPrice == null,
    });
  }, [approvedSnapshot]);

  const handleMarkTradeAsActive = () => {
    markTradeAsActive();
    toast.success("Trade marked active — added to Active Trade Monitoring");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {/* Main column */}
      <div className="flex flex-col gap-6">
        <TradePlanCard input={tradeInput} onChange={patchTradeInput} />

        {/*
          Workflow hierarchy: Trade Plan → Action Buttons → Rule Check.
          Action buttons sit directly under the form so Check Trade is the
          first thing the trader sees after entering a plan — the compact
          Rule Check below is the post-check feedback surface, not a gate
          the trader has to read past to reach the primary action.

          V1 beta: the Live Risk Preview panel is hidden so the trader
          can't pre-adjust share size off live risk feedback. Risk numbers
          surface inside the RuleCheckModal after Check Trade.

          Reactivating Live Risk Preview: mount <RiskPreviewCard risk={riskCalc}
          rules={riskRules} /> above the rule check (or wrap them in a
          2-col grid) — the slice still computes risk numbers either way.
        */}
        <ActionButtons
          onCheckTrade={checkTrade}
          onClearForm={clearTradeInput}
          onSaveDraft={handleSaveDraft}
          canMarkActive={approvedSnapshot != null}
          approvalStatus={approvedSnapshot?.approvalStatus ?? null}
          onMarkTradeAsActive={handleMarkTradeAsActive}
        />

        <RuleCheckCard
          results={displayedRuleResults}
          checked={hasCheckedTrade}
        />

        <ActiveTradePanel />

        {/* Bottom workflow continuation area. Mirrors Start New Session
            from the page header so traders already scrolled into Active
            Trade Monitoring don't have to scroll back up. Clear Form is
            duplicated here for the same reason. */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Session Controls
            </span>
            <span className="text-xs text-muted-foreground">
              Reset the session window. Trader, history, and journal are
              preserved.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearTradeInput}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear Form
            </button>
            <StartNewSessionButton variant="primary" />
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-6">
        <BehaviorFeedPreview events={sessionEvents} />
      </div>

      <RuleCheckModal
        open={modalOpen}
        onOpenChange={(next) => {
          if (!next) useAppStore.getState().closeModal();
        }}
        results={modalResults}
        risk={riskCalc}
        rules={riskRules}
        validationStatus={validation?.validationStatus ?? null}
        onContinueAnyway={() => handleIntervention("continue_anyway")}
        onReviseTrade={() => handleIntervention("revise_trade")}
        onCancelTrade={() => handleIntervention("cancel_trade")}
        onConfirmApproval={() => useAppStore.getState().closeModal()}
      />
    </div>
  );
}
