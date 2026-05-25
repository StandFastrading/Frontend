"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  BEHAVIOR_EVENT_DISPLAY,
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import { ActionButtons } from "@/features/desk/components/action-buttons";
import { ActiveTradePanel } from "@/features/desk/components/active-trade-panel";
import { BehaviorFeedPreview } from "@/features/desk/components/behavior-feed-preview";
import { RiskPreviewCard } from "@/features/desk/components/risk-preview-card";
import { RuleCheckCard } from "@/features/desk/components/rule-check-card";
import { RuleCheckModal } from "@/features/desk/components/rule-check-modal";
import { TradePlanCard } from "@/features/desk/components/trade-plan-card";
import { calculateRisk } from "@/features/desk/calculate-risk";
import { UNCHECKED_RULES, checkRules } from "@/features/desk/check-rules";
import {
  appendDecisionLog,
  buildBehaviorEventRecord,
  type DecisionAction,
} from "@/features/desk/decision-log";
import {
  EMPTY_TRADE_INPUT,
  MOCK_BEHAVIOR_EVENTS,
  MOCK_SESSION_STATE,
  MOCK_USER_RULES,
} from "@/features/desk/mock-data";
import type {
  BehaviorEvent,
  RuleCheckResult,
  TradeInput,
} from "@/features/desk/types";

function nowTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Build a feed-visible event from the canonical event-type vocabulary. All
// display metadata (title/description/tone/icon) is pulled from the shared
// registry — never hardcoded here.
function buildEvent(eventType: BehaviorEventType): BehaviorEvent {
  const d = BEHAVIOR_EVENT_DISPLAY[eventType];
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    time: nowTime(),
    title: d.displayTitle,
    description: d.displayDescription,
    tone: d.tone,
    icon: d.icon,
  };
}

export function TradeDeskWorkspace() {
  const [tradeInput, setTradeInput] = useState<TradeInput>(EMPTY_TRADE_INPUT);
  const [hasCheckedTrade, setHasCheckedTrade] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalResults, setModalResults] = useState<RuleCheckResult[]>([]);
  const [events, setEvents] = useState<BehaviorEvent[]>(MOCK_BEHAVIOR_EVENTS);

  const userRules = MOCK_USER_RULES;
  const sessionState = MOCK_SESSION_STATE;

  const risk = useMemo(
    () => calculateRisk(tradeInput, userRules, sessionState),
    [tradeInput, userRules, sessionState],
  );

  const ruleCheckResults = useMemo(
    () =>
      hasCheckedTrade
        ? checkRules(tradeInput, userRules, sessionState, risk)
        : UNCHECKED_RULES,
    [hasCheckedTrade, tradeInput, userRules, sessionState, risk],
  );

  const addEvent = (event: BehaviorEvent) => {
    setEvents((prev) => [event, ...prev]);
  };

  const handleChange = (patch: Partial<TradeInput>) => {
    setTradeInput((prev) => ({ ...prev, ...patch }));
    if (hasCheckedTrade) setHasCheckedTrade(false);
  };

  const handleCheckTrade = () => {
    const results = checkRules(tradeInput, userRules, sessionState, risk);
    setHasCheckedTrade(true);

    const fails = results.filter((r) => r.status === "fail").length;
    const warns = results.filter((r) => r.status === "warning").length;

    if (fails === 0 && warns === 0) {
      // Clean approval: log on every successful check (not just the first).
      // Event built and committed explicitly here — no helper indirection —
      // so the state update is visible alongside the toast/log calls.
      const approvalEvent = buildEvent(BEHAVIOR_EVENT_TYPES.TRADE_APPROVED);
      const record = buildBehaviorEventRecord({
        input: tradeInput,
        results,
        risk,
        eventType: BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
        decision: "approved",
      });
      setEvents((prev) => {
        const next = [approvalEvent, ...prev];
        if (typeof window !== "undefined") {
          console.debug(
            "[desk] approval event prepended",
            approvalEvent,
            "feed length:",
            next.length,
          );
        }
        return next;
      });
      appendDecisionLog(record);
      toast.success("Trade matches your rules");
      return;
    }

    setModalResults(results);
    setModalOpen(true);
  };

  const handleClearForm = () => {
    setTradeInput(EMPTY_TRADE_INPUT);
    setHasCheckedTrade(false);
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved (local only — broker sync coming later)");
  };

  // Every modal decision is persisted to the centralized behavior event log
  // (currently localStorage, future: backend). The narrative feed entry is
  // kept for in-page UI continuity and is separate from the analytical record.
  const recordDecision = (
    eventType: BehaviorEventType,
    decision: DecisionAction,
  ) => {
    const record = buildBehaviorEventRecord({
      input: tradeInput,
      results: modalResults,
      risk,
      eventType,
      decision,
    });
    appendDecisionLog(record);
  };

  // Close the modal and clear the intervention state that drove it, but
  // leave tradeInput / form fields untouched.
  const dismissIntervention = () => {
    setModalOpen(false);
    setModalResults([]);
    setHasCheckedTrade(false);
  };

  const handleContinueAnyway = () => {
    recordDecision(BEHAVIOR_EVENT_TYPES.WARNING_IGNORED, "continue_anyway");
    addEvent(buildEvent(BEHAVIOR_EVENT_TYPES.WARNING_IGNORED));
    setModalOpen(false);
    setModalResults([]);
    toast.warning("Warning ignored — proceed at your own discretion");
  };

  const handleReviseTrade = () => {
    recordDecision(BEHAVIOR_EVENT_TYPES.TRADE_REVISED, "revise_trade");
    addEvent(buildEvent(BEHAVIOR_EVENT_TYPES.TRADE_REVISION_STARTED));
    dismissIntervention();
  };

  // Cancel = a meaningful behavioral decision, not just a popup dismiss.
  // Form stays populated so the trader can revise the same setup afterward.
  const handleCancelTrade = () => {
    recordDecision(BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED, "cancel_trade");
    addEvent(buildEvent(BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED));
    dismissIntervention();
    toast.success("Trade canceled — setup preserved for revision");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {/* Main column */}
      <div className="flex flex-col gap-6">
        <TradePlanCard input={tradeInput} onChange={handleChange} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RiskPreviewCard risk={risk} rules={userRules} />
          <RuleCheckCard results={ruleCheckResults} checked={hasCheckedTrade} />
        </div>

        <ActionButtons
          onCheckTrade={handleCheckTrade}
          onClearForm={handleClearForm}
          onSaveDraft={handleSaveDraft}
        />

        <ActiveTradePanel />
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-6">
        <BehaviorFeedPreview events={events} />
      </div>

      <RuleCheckModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        results={modalResults}
        onContinueAnyway={handleContinueAnyway}
        onReviseTrade={handleReviseTrade}
        onCancelTrade={handleCancelTrade}
      />
    </div>
  );
}
