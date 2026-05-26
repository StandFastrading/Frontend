import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type { BehaviorEventType } from "@/lib/behavior-events";
import { getCurrentSessionEvents } from "@/lib/sessions/session-helpers";
import {
  parsePrice,
  validateTrade,
} from "@/lib/validation/trade-validation-engine";
import type {
  ActiveTrade,
  ApprovedTradeSnapshot,
  InterventionDecision,
  RuleResult,
  TradeInput,
  ValidationResult,
} from "@/types";
import { eventTypeFromDecision } from "@/types";
import { buildBehaviorEvent } from "@/features/desk/decision-log";
import type { SliceCreator } from "@/store/types";

// Trade Desk slice owns the in-flight trade input, the latest validation
// run, and the rule-check modal state. Business logic (validateTrade, event
// emission, intervention recording, approval → active promotion) is
// centralized here so the page stays dumb.

export const EMPTY_TRADE_INPUT: TradeInput = {
  symbol: "",
  marketType: "Stocks",
  direction: "Long",
  entryPrice: "",
  stopPrice: "",
  targetPrice: "",
  positionSize: null,
  setupType: "",
  tradePlan: "",
};

export type TradeDeskSlice = {
  tradeInput: TradeInput;
  // Latest validation engine result. Recomputed on input/rules/session
  // changes via `recomputeValidation()`. `null` when nothing has been
  // validated yet.
  validation: ValidationResult | null;
  // The user has clicked "Check Trade" at least once. Until then, the rule
  // check card shows the placeholder/UNCHECKED set instead of live results.
  hasCheckedTrade: boolean;
  // Frozen approved plan + risk numbers, captured the moment `checkTrade()`
  // returns approval. Present until the user marks it active or edits the
  // form. NOT persisted — a reload should reset the in-flight approval
  // state since the trader might want to re-validate from scratch.
  approvedSnapshot: ApprovedTradeSnapshot | null;
  // Modal state lives in the slice so the workspace stays presentational.
  modalOpen: boolean;
  modalResults: RuleResult[];
  // Append-only validation history — every `checkTrade()` push lands here
  // and persists. Foundation for future per-rule analytics.
  validationHistory: ValidationResult[];

  patchTradeInput: (patch: Partial<TradeInput>) => void;
  clearTradeInput: () => void;
  recomputeValidation: () => void;
  checkTrade: () => void;
  // Manual broker bridge: promote the latest approved snapshot to a real
  // ActiveTrade and emit a TRADE_MARKED_ACTIVE behavior event. No-op when
  // no snapshot exists.
  markTradeAsActive: () => void;
  recordInterventionDecision: (decision: InterventionDecision) => void;
  closeModal: () => void;
};

// Build the snapshot we freeze at the moment of approval. Returns null if
// any required field can't be parsed — shouldn't happen in practice because
// validateTrade requires entry/stop/size to grant approval, but we guard so
// the action is safe to call defensively.
// Build the snapshot the "Mark Trade as Active" CTA reads from. The
// requirements differ by pathway:
//
//   - clean approval (Check Trade): the validation engine has already
//     enforced entry / stop / size, so all fields are present.
//   - override (Continue Anyway): only the spec-required *essential*
//     fields (symbol, direction, entry, position size) are enforced here.
//     Stop, target, and any derived risk number are allowed to be null —
//     the missing-stop warning is preserved on `approvalWarnings` so the
//     panel can surface it after activation.
function buildApprovedSnapshot(
  tradeInput: TradeInput,
  validation: ValidationResult,
  approvalStatus: ApprovedTradeSnapshot["approvalStatus"],
  approvalWarnings: ApprovedTradeSnapshot["approvalWarnings"],
  overrideAccepted: boolean,
): ApprovedTradeSnapshot | null {
  const entryPrice = parsePrice(tradeInput.entryPrice);
  const stopPrice = parsePrice(tradeInput.stopPrice);
  const targetPrice = parsePrice(tradeInput.targetPrice);
  const { positionSize } = tradeInput;
  const { totalRisk, accountRiskPercent, rewardRiskRatio } =
    validation.riskCalculation;

  // Essential fields — without these the trade can't be tracked at all,
  // so we refuse to build a snapshot. Stop, total risk, and account risk
  // percent are allowed to be null for override activations.
  const hasSymbol = tradeInput.symbol.trim().length > 0;
  if (
    !hasSymbol ||
    entryPrice == null ||
    positionSize == null
  ) {
    return null;
  }

  return {
    symbol: tradeInput.symbol.trim(),
    marketType: tradeInput.marketType,
    direction: tradeInput.direction,
    entryPrice,
    stopPrice,
    targetPrice,
    positionSize,
    setupType: tradeInput.setupType,
    tradePlan: tradeInput.tradePlan,
    approvedAt: validation.timestamp,
    originalRisk: totalRisk,
    accountRiskPercent,
    rewardRiskRatio,
    approvalStatus,
    approvalWarnings,
    overrideAccepted,
  };
}

export const createTradeDeskSlice: SliceCreator<TradeDeskSlice> = (
  set,
  get,
) => ({
  tradeInput: EMPTY_TRADE_INPUT,
  validation: null,
  hasCheckedTrade: false,
  approvedSnapshot: null,
  modalOpen: false,
  modalResults: [],
  validationHistory: [],

  patchTradeInput: (patch) => {
    set((state) => ({
      tradeInput: { ...state.tradeInput, ...patch },
      // Editing inputs after a check resets the "checked" flag so the rule
      // card stops showing stale rule-result statuses next to inputs the
      // user has since changed. The approved snapshot also drops so the
      // "Mark Trade as Active" CTA disappears until the trader re-checks.
      hasCheckedTrade: false,
      approvedSnapshot: null,
    }));
    get().recomputeValidation();
  },

  clearTradeInput: () => {
    set(() => ({
      tradeInput: EMPTY_TRADE_INPUT,
      hasCheckedTrade: false,
      approvedSnapshot: null,
    }));
    get().recomputeValidation();
  },

  recomputeValidation: () => {
    const state = get();
    // Session-scoped behavior events only — historical activity must not
    // inflate today's projected daily risk or any future analytics-aware
    // check the engine runs.
    const sessionEvents = getCurrentSessionEvents(state);
    const result = validateTrade({
      tradeInput: state.tradeInput,
      riskRules: state.riskRules,
      sessionMetrics: state.session,
      behaviorEvents: sessionEvents,
    });
    set(() => ({ validation: result }));
  },

  checkTrade: () => {
    // Always run the engine fresh on click — we don't trust whatever
    // `recomputeValidation()` last computed in case anything stale slipped
    // in between input change and click.
    const state = get();
    const sessionEvents = getCurrentSessionEvents(state);
    const result = validateTrade({
      tradeInput: state.tradeInput,
      riskRules: state.riskRules,
      sessionMetrics: state.session,
      behaviorEvents: sessionEvents,
    });
    const { tradeInput } = state;

    set((state) => ({
      validation: result,
      hasCheckedTrade: true,
      validationHistory: [result, ...state.validationHistory],
    }));

    if (result.canReceiveStandFastApproval) {
      const approval = buildBehaviorEvent({
        input: tradeInput,
        results: result.ruleResults,
        risk: result.riskCalculation,
        eventType: BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
        decision: "approved",
      });
      get().appendBehaviorEvent(approval);
      const snapshot = buildApprovedSnapshot(
        tradeInput,
        result,
        "approved",
        [],
        false,
      );
      set(() => ({ approvedSnapshot: snapshot }));
      return;
    }

    // Anything short of approval drops any prior snapshot so the active
    // bridge button is only ever visible while a fresh approval is live.
    set(() => ({
      approvedSnapshot: null,
      modalOpen: true,
      modalResults: result.ruleResults,
    }));
  },

  markTradeAsActive: () => {
    const { approvedSnapshot } = get();
    if (!approvedSnapshot) return;

    const activatedAt = new Date().toISOString();
    const trade: ActiveTrade = {
      id: `at-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...approvedSnapshot,
      activatedAt,
      // Mutable state initialized from the baseline. The deviation engine
      // compares against the baseline; these track the live position.
      currentStopPrice: approvedSnapshot.stopPrice,
      currentPositionSize: approvedSnapshot.positionSize,
      currentAvgEntry: approvedSnapshot.entryPrice,
      currentRisk: approvedSnapshot.originalRisk,
      currentAccountRiskPercent: approvedSnapshot.accountRiskPercent,
      currentRewardRiskRatio: approvedSnapshot.rewardRiskRatio,
      mistakeFlagged: false,
      mistakeNote: null,
      closedAt: null,
      exitPrice: null,
      exitOutcome: null,
      realizedPnL: null,
      realizedR: null,
      exitReflection: null,
      status: "active",
      source: "manual_confirmation",
    };
    get().appendActiveTrade(trade);

    // Log the manual confirmation so analytics can correlate "approved →
    // entered" rates. Display strings come from the centralized vocabulary
    // (BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE).
    const event = buildBehaviorEvent({
      input: get().tradeInput,
      results: [],
      risk: get().validation?.riskCalculation ?? {
        riskPerShare: null,
        totalRisk: null,
        estimatedReward: null,
        rewardRiskRatio: null,
        accountRiskPercent: null,
        projectedDailyRiskPercent: null,
      },
      eventType: BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
    });
    get().appendBehaviorEvent(event);

    // Clear the snapshot + checked flag so the CTA disappears and the form
    // returns to "pre-check" state. The trade input itself stays populated
    // in case the trader wants to journal afterwards.
    set(() => ({ approvedSnapshot: null, hasCheckedTrade: false }));
  },

  recordInterventionDecision: (decision) => {
    const { tradeInput, validation, modalResults } = get();
    if (!validation) return;

    if (process.env.NODE_ENV === "development") {
      console.debug("[trade-desk] intervention decision", {
        decision,
        validationStatus: validation.validationStatus,
        triggeredRuleCount: validation.triggeredRules.length,
      });
    }

    // Continue Anyway behavior:
    //   - On warning-only checks: emit TRADE_OVERRIDE_ACCEPTED (amber).
    //   - On checks with hard fails: emit WARNING_IGNORED (rose).
    // In BOTH cases the trader can still activate the trade if essential
    // tracking fields are present — they have consciously overridden, which
    // is high-value behavioral data and must be trackable.
    const isContinueAnyway = decision === "continue_anyway";
    const isWarningOnlyOverride =
      isContinueAnyway && validation.validationStatus === "warning";

    let eventType: BehaviorEventType;
    if (isContinueAnyway) {
      eventType = isWarningOnlyOverride
        ? BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED
        : BEHAVIOR_EVENT_TYPES.WARNING_IGNORED;
    } else if (decision === "revise_trade") {
      eventType = BEHAVIOR_EVENT_TYPES.TRADE_REVISED;
    } else {
      eventType = BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED;
    }

    const event = buildBehaviorEvent({
      input: tradeInput,
      results: modalResults,
      risk: validation.riskCalculation,
      eventType,
      decision,
    });
    get().appendBehaviorEvent(event);

    // Structured decision record — every spec field populated at write
    // time. Reports / Journal / Behavior Analytics read directly from this
    // shape; nothing downstream has to re-derive the math.
    const { riskRules } = get();
    const warningCount = validation.triggeredRules.filter(
      (r) => r.status === "warning",
    ).length;
    const violationCount = validation.triggeredRules.filter(
      (r) => r.status === "fail",
    ).length;
    const interventionTimestamp = new Date().toISOString();

    get().appendIntervention({
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: interventionTimestamp,
      decision,
      eventType: eventTypeFromDecision(decision),
      severity:
        validation.validationStatus === "violation" ? "violation" : "warning",

      // Flat trade context — populated whenever the user supplied it on
      // the form. Optional in the schema because legacy records didn't
      // carry these top-level.
      symbol: tradeInput.symbol || undefined,
      marketType: tradeInput.marketType,
      direction: tradeInput.direction,
      setupType: tradeInput.setupType || undefined,
      entryPrice: tradeInput.entryPrice || undefined,
      stopPrice: tradeInput.stopPrice || undefined,
      targetPrice: tradeInput.targetPrice || undefined,
      positionSize: tradeInput.positionSize,

      // Risk snapshot at decision time.
      accountSize: riskRules.accountSize,
      totalRisk: validation.riskCalculation.totalRisk,
      accountRiskPercent: validation.riskCalculation.accountRiskPercent,
      rewardRiskRatio: validation.riskCalculation.rewardRiskRatio,

      // Validation context.
      validationStatus: validation.validationStatus,
      triggeredRules: validation.triggeredRules,
      warningCount,
      violationCount,

      // Provenance.
      source: "trade_desk_intervention",
      // sessionId + tradingDate are auto-stamped by `appendIntervention`
      // from the active TradingSession.

      // Linked behavior-feed event id.
      behaviorEventId: event.id,
    });

    // Any Continue Anyway — warning OR violation — produces a snapshot if
    // essential tracking fields are present. Warning-overrides AND
    // fail-overrides both yield "approved_with_warnings" with the triggered
    // rules preserved on `approvalWarnings`. The CTA appears so the trader
    // can mark the trade active; non-Continue-Anyway decisions (cancel,
    // revise) leave the snapshot null and the CTA stays hidden.
    let nextSnapshot = get().approvedSnapshot;
    if (isContinueAnyway) {
      nextSnapshot = buildApprovedSnapshot(
        tradeInput,
        validation,
        "approved_with_warnings",
        validation.triggeredRules,
        true,
      );
      if (process.env.NODE_ENV === "development") {
        console.debug("[trade-desk] approved_with_warnings snapshot", {
          created: nextSnapshot != null,
          missingStop: nextSnapshot != null && nextSnapshot.stopPrice == null,
          approvalWarningCount: nextSnapshot?.approvalWarnings.length ?? 0,
        });
      }
    } else {
      // Cancel + Revise clear any prior snapshot — the CTA must not surface
      // on a non-activation decision.
      nextSnapshot = null;
    }

    // Continue Anyway leaves the form populated; revise + cancel close the
    // modal but also leave the form so the trader can edit. (Cancel still
    // counts as a meaningful behavioral decision, not just a popup dismiss.)
    set(() => ({
      modalOpen: false,
      modalResults: [],
      hasCheckedTrade: decision === "continue_anyway",
      approvedSnapshot: nextSnapshot,
    }));
  },

  closeModal: () =>
    set(() => ({ modalOpen: false, modalResults: [], hasCheckedTrade: false })),
});
