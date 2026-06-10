// Mappers between zustand slice types (camelCase) and Supabase row types
// (snake_case). One section per entity. Each mapper exposes:
//   - toInsert(slice, userId)  → row insert payload
//   - toUpdate(slice)          → patch payload for an UPDATE
//   - fromRow(row)             → slice type
// The sync layer + StoreHydrator are the only callers.

import type {
  ActiveTrade,
  ActiveTradeApprovalStatus,
  ActiveTradeExitOutcome,
} from "@/types/active-trade";
import type { BehaviorEvent, TriggeredRule } from "@/types/behavior-event";
import type { ClosedTrade, ExitReason } from "@/types/closed-trade";
import type { InterventionEvent } from "@/types/intervention";
import type { MonitoringEvent } from "@/types/active-trade-update";
import type {
  DailyReflection,
  SessionNote,
  TradeReflection,
} from "@/types/reflection";
import type { RiskRules } from "@/types/risk-rules";
import type { TradingSession } from "@/types/trading-session";
import type { UserProfile } from "@/types/user-profile";
import { parseBehavioralBaseline } from "@/types/user-profile";
import type {
  BehaviorEventInsert,
  BehaviorEventRow,
  DailyReflectionInsert,
  DailyReflectionRow,
  InterventionInsert,
  InterventionRow,
  MarketType,
  ProfileInsert,
  ProfileRow,
  ProfileUpdate,
  RiskRulesInsert,
  RiskRulesRow,
  SessionNoteInsert,
  SessionNoteRow,
  TradeInsert,
  TradeMonitoringEventInsert,
  TradeMonitoringEventRow,
  TradeReflectionInsert,
  TradeReflectionRow,
  TradeRow,
  TradeUpdate,
  TradingSessionInsert,
  TradingSessionRow,
  TradingSessionUpdate,
} from "@/types/supabase";

const isMarketType = (v: unknown): v is MarketType =>
  v === "Stocks" ||
  v === "Options" ||
  v === "Futures" ||
  v === "Forex" ||
  v === "Crypto";

// ============================================================================
// Profile (UserProfile <-> profiles row)
// ============================================================================

export const profileMapper = {
  table: "profiles" as const,
  toUpsert(profile: UserProfile, userId: string): ProfileInsert {
    return {
      id: userId,
      display_name: profile.displayName,
      email: profile.email,
      plan: profile.plan,
      onboarding_complete: profile.onboardingComplete,
      selected_markets: profile.selectedMarkets.filter(isMarketType),
      behavioral_baseline: profile.behavioralBaseline ?? {},
    };
  },
  toUpdate(profile: Partial<UserProfile>): ProfileUpdate {
    const patch: ProfileUpdate = {};
    if (profile.displayName !== undefined) patch.display_name = profile.displayName;
    if (profile.email !== undefined) patch.email = profile.email;
    if (profile.plan !== undefined) patch.plan = profile.plan;
    if (profile.onboardingComplete !== undefined)
      patch.onboarding_complete = profile.onboardingComplete;
    if (profile.selectedMarkets !== undefined)
      patch.selected_markets = profile.selectedMarkets.filter(isMarketType);
    if (profile.behavioralBaseline !== undefined)
      patch.behavioral_baseline = profile.behavioralBaseline;
    return patch;
  },
  fromRow(row: ProfileRow): UserProfile {
    return {
      userId: row.id,
      displayName: row.display_name,
      email: row.email,
      plan: row.plan,
      onboardingComplete: row.onboarding_complete,
      selectedMarkets: row.selected_markets,
      behavioralBaseline: parseBehavioralBaseline(row.behavioral_baseline),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

// ============================================================================
// Risk rules
// ============================================================================

export const riskRulesMapper = {
  table: "risk_rules" as const,
  toUpsert(rules: RiskRules, userId: string): RiskRulesInsert {
    return {
      user_id: userId,
      account_size: rules.accountSize,
      account_currency: rules.accountCurrency,
      account_type: rules.accountType,
      base_risk_per_trade_percent: rules.baseRiskPerTradePercent,
      max_dollar_risk_per_trade: rules.maxDollarRiskPerTrade,
      max_daily_loss_percent: rules.maxDailyLossPercent,
      max_daily_trades: rules.maxDailyTrades,
      max_red_trades: rules.maxRedTrades,
      max_consecutive_losses: rules.maxConsecutiveLosses,
      cooldown_after_loss_minutes: rules.cooldownAfterLossMinutes,
      require_stop_loss: rules.requireStopLoss,
      minimum_reward_risk: rules.minimumRewardRisk,
      max_position_size: rules.maxPositionSize,
      max_adds_per_trade: rules.maxAddsPerTrade,
      max_open_positions: rules.maxOpenPositions,
      no_averaging_down: rules.noAveragingDown,
      setup_must_be_approved: rules.setupMustBeApproved,
      allowed_setups: rules.allowedSetups,
      no_reentry_within_minutes: rules.noReentryWithinMinutes,
      no_revenge_trading: rules.noRevengeTrading,
      no_trading_after_emotional_warning: rules.noTradingAfterEmotionalWarning,
      no_trades_outside_allowed_setups: rules.noTradesOutsideAllowedSetups,
      no_overtrading: rules.noOvertrading,
      warning_level: rules.warningLevel,
      require_confirmation_before_override: rules.requireConfirmationBeforeOverride,
      reflection_prompt_after_override: rules.reflectionPromptAfterOverride,
      lockout_after_max_loss: rules.lockoutAfterMaxLoss,
      market_config: rules.marketConfig ?? {},
    };
  },
  fromRow(row: RiskRulesRow): RiskRules {
    return {
      accountSize: row.account_size,
      accountCurrency: row.account_currency,
      accountType: row.account_type,
      baseRiskPerTradePercent: row.base_risk_per_trade_percent,
      maxDollarRiskPerTrade: row.max_dollar_risk_per_trade,
      maxDailyLossPercent: row.max_daily_loss_percent,
      maxDailyTrades: row.max_daily_trades,
      maxRedTrades: row.max_red_trades,
      maxConsecutiveLosses: row.max_consecutive_losses,
      cooldownAfterLossMinutes: row.cooldown_after_loss_minutes,
      requireStopLoss: row.require_stop_loss,
      minimumRewardRisk: row.minimum_reward_risk,
      maxPositionSize: row.max_position_size,
      maxAddsPerTrade: row.max_adds_per_trade,
      maxOpenPositions: row.max_open_positions,
      noAveragingDown: row.no_averaging_down,
      setupMustBeApproved: row.setup_must_be_approved,
      allowedSetups: row.allowed_setups,
      noReentryWithinMinutes: row.no_reentry_within_minutes,
      noRevengeTrading: row.no_revenge_trading,
      noTradingAfterEmotionalWarning: row.no_trading_after_emotional_warning,
      noTradesOutsideAllowedSetups: row.no_trades_outside_allowed_setups,
      noOvertrading: row.no_overtrading,
      warningLevel: row.warning_level,
      requireConfirmationBeforeOverride: row.require_confirmation_before_override,
      reflectionPromptAfterOverride: row.reflection_prompt_after_override,
      lockoutAfterMaxLoss: row.lockout_after_max_loss,
      marketConfig: (row.market_config as Record<string, unknown>) ?? {},
      updatedAt: row.updated_at,
    };
  },
};

// ============================================================================
// Trading sessions
// ============================================================================

export const tradingSessionMapper = {
  table: "trading_sessions" as const,
  toUpsert(session: TradingSession, userId: string): TradingSessionInsert {
    return {
      user_id: userId,
      client_id: session.sessionId,
      trading_date: session.tradingDate,
      session_type: session.sessionType,
      custom_label: session.customLabel,
      status: session.status,
      started_at: session.startedAt,
      ended_at: session.endedAt,
    };
  },
  toUpdate(session: Partial<TradingSession>): TradingSessionUpdate {
    const patch: TradingSessionUpdate = {};
    if (session.sessionType !== undefined) patch.session_type = session.sessionType;
    if (session.customLabel !== undefined) patch.custom_label = session.customLabel;
    if (session.status !== undefined) patch.status = session.status;
    if (session.endedAt !== undefined) patch.ended_at = session.endedAt;
    return patch;
  },
  fromRow(row: TradingSessionRow): TradingSession {
    return {
      sessionId: row.client_id ?? row.id,
      tradingDate: row.trading_date,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      sessionType: row.session_type,
      customLabel: row.custom_label,
      status: row.status,
    };
  },
};

// ============================================================================
// Trades (unified active + closed)
// ============================================================================

function activeTradeToInsert(
  trade: ActiveTrade,
  userId: string,
  tradingDate: string,
): TradeInsert {
  return {
    user_id: userId,
    client_id: trade.id,
    session_id: trade.sessionId ?? null,
    trading_date: trade.tradingDate ?? tradingDate,
    symbol: trade.symbol,
    market_type: trade.marketType,
    direction: trade.direction,
    setup_type: trade.setupType,
    entry_price: trade.entryPrice,
    stop_price: trade.stopPrice,
    target_price: trade.targetPrice,
    position_size: trade.positionSize,
    trade_plan: trade.tradePlan,
    approved_at: trade.approvedAt,
    activated_at: trade.activatedAt,
    original_risk: trade.originalRisk,
    account_risk_percent: trade.accountRiskPercent,
    reward_risk_ratio: trade.rewardRiskRatio,
    current_stop_price: trade.currentStopPrice,
    current_target_price: trade.currentTargetPrice,
    current_position_size: trade.currentPositionSize,
    current_avg_entry: trade.currentAvgEntry,
    current_risk: trade.currentRisk,
    current_account_risk_percent: trade.currentAccountRiskPercent,
    current_reward_risk_ratio: trade.currentRewardRiskRatio,
    mistake_flagged: trade.mistakeFlagged,
    mistake_note: trade.mistakeNote,
    approval_status: trade.approvalStatus,
    approval_warnings: trade.approvalWarnings as never,
    override_accepted: trade.overrideAccepted,
    status: "active",
    source: trade.source,
  };
}

function activeTradeToUpdate(trade: ActiveTrade): TradeUpdate {
  return {
    current_stop_price: trade.currentStopPrice,
    current_target_price: trade.currentTargetPrice,
    current_position_size: trade.currentPositionSize,
    current_avg_entry: trade.currentAvgEntry,
    current_risk: trade.currentRisk,
    current_account_risk_percent: trade.currentAccountRiskPercent,
    current_reward_risk_ratio: trade.currentRewardRiskRatio,
    mistake_flagged: trade.mistakeFlagged,
    mistake_note: trade.mistakeNote,
  };
}

function closedTradeToInsert(
  trade: ClosedTrade,
  userId: string,
  tradingDate: string,
): TradeInsert {
  return {
    user_id: userId,
    client_id: trade.id,
    session_id: trade.sessionId ?? null,
    trading_date: trade.tradingDate ?? tradingDate,
    symbol: trade.symbol,
    market_type: trade.marketType,
    direction: trade.direction,
    setup_type: trade.setupType,
    entry_price: trade.entryPrice,
    position_size: trade.positionSize,
    trade_plan: "",
    approved_at: trade.approvedAt,
    activated_at: trade.activatedAt,
    original_risk: trade.originalRisk,
    current_position_size: trade.positionSize,
    current_avg_entry: trade.entryPrice,
    mistake_flagged: trade.mistakeCount > 0,
    closed_at: trade.closedAt,
    exit_price: trade.exitPrice,
    exit_outcome: trade.outcome,
    realized_pnl: trade.realizedPnL,
    realized_r: trade.realizedR,
    exit_reflection: trade.exitReflection,
    exit_reason: trade.exitReason,
    exit_notes: trade.exitNotes,
    loss_reduced: trade.lossReduced,
    loss_reduction_amount: trade.lossReductionAmount,
    loss_reduction_percent: trade.lossReductionPercent,
    deviation_count: trade.deviationCount,
    mistake_count: trade.mistakeCount,
    status: "closed",
    approval_status: "approved",
    override_accepted: false,
    source: "manual_confirmation",
  };
}

function tradeRowToActive(row: TradeRow): ActiveTrade {
  return {
    id: row.client_id ?? row.id,
    symbol: row.symbol,
    marketType: row.market_type,
    direction: row.direction,
    entryPrice: row.entry_price,
    stopPrice: row.stop_price,
    targetPrice: row.target_price,
    positionSize: row.position_size,
    setupType: row.setup_type,
    tradePlan: row.trade_plan,
    approvedAt: row.approved_at,
    activatedAt: row.activated_at,
    originalRisk: row.original_risk,
    accountRiskPercent: row.account_risk_percent,
    rewardRiskRatio: row.reward_risk_ratio,
    currentStopPrice: row.current_stop_price,
    currentTargetPrice: row.current_target_price,
    currentPositionSize: row.current_position_size,
    currentAvgEntry: row.current_avg_entry,
    currentRisk: row.current_risk,
    currentAccountRiskPercent: row.current_account_risk_percent,
    currentRewardRiskRatio: row.current_reward_risk_ratio,
    mistakeFlagged: row.mistake_flagged,
    mistakeNote: row.mistake_note,
    closedAt: row.closed_at,
    exitPrice: row.exit_price,
    exitOutcome: row.exit_outcome as ActiveTradeExitOutcome | null,
    realizedPnL: row.realized_pnl,
    realizedR: row.realized_r,
    exitReflection: row.exit_reflection,
    approvalStatus: row.approval_status as ActiveTradeApprovalStatus,
    approvalWarnings: (row.approval_warnings as TriggeredRule[]) ?? [],
    overrideAccepted: row.override_accepted,
    status: "active",
    source: "manual_confirmation",
    sessionId: row.session_id ?? undefined,
    tradingDate: row.trading_date,
  };
}

function tradeRowToClosed(row: TradeRow): ClosedTrade {
  return {
    id: row.client_id ?? row.id,
    symbol: row.symbol,
    setupType: row.setup_type,
    marketType: row.market_type,
    direction: row.direction,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price ?? 0,
    positionSize: row.position_size,
    originalRisk: row.original_risk,
    realizedPnL: row.realized_pnl ?? 0,
    realizedR: row.realized_r,
    outcome: (row.exit_outcome ?? "breakeven") as ActiveTradeExitOutcome,
    deviationCount: row.deviation_count,
    mistakeCount: row.mistake_count,
    exitReflection: row.exit_reflection,
    exitReason: row.exit_reason as ExitReason | null,
    exitNotes: row.exit_notes,
    lossReduced: row.loss_reduced,
    lossReductionAmount: row.loss_reduction_amount,
    lossReductionPercent: row.loss_reduction_percent,
    approvedAt: row.approved_at,
    activatedAt: row.activated_at,
    closedAt: row.closed_at ?? row.updated_at,
    sessionId: row.session_id ?? undefined,
    tradingDate: row.trading_date,
  };
}

export const tradeMapper = {
  table: "trades" as const,
  activeTradeToInsert,
  activeTradeToUpdate,
  closedTradeToInsert,
  tradeRowToActive,
  tradeRowToClosed,
};

// ============================================================================
// Behavior events (append-only)
// ============================================================================

export const behaviorEventMapper = {
  table: "behavior_events" as const,
  toInsert(event: BehaviorEvent, userId: string): BehaviorEventInsert {
    return {
      user_id: userId,
      client_id: event.id,
      session_id: event.sessionId ?? null,
      trading_date: event.tradingDate ?? null,
      event_type: event.eventType,
      display_title: event.displayTitle,
      display_description: event.displayDescription,
      source: event.source,
      symbol: event.symbol ?? null,
      setup_type: event.setupType ?? null,
      direction: event.direction ?? null,
      decision: event.decision ?? null,
      severity: event.severity,
      triggered_rules: event.triggeredRules as never,
      total_risk: event.totalRisk,
      account_risk_percent: event.accountRiskPercent,
      metadata: (event.metadata ?? {}) as never,
      timestamp: event.timestamp,
    };
  },
  fromRow(row: BehaviorEventRow): BehaviorEvent {
    return {
      id: row.client_id ?? row.id,
      eventType: row.event_type as BehaviorEvent["eventType"],
      displayTitle: row.display_title,
      displayDescription: row.display_description,
      timestamp: row.timestamp,
      source: row.source,
      symbol: row.symbol ?? undefined,
      setupType: row.setup_type ?? undefined,
      direction: row.direction ?? undefined,
      decision: row.decision ?? undefined,
      severity: row.severity,
      triggeredRules: (row.triggered_rules as TriggeredRule[]) ?? [],
      totalRisk: row.total_risk,
      accountRiskPercent: row.account_risk_percent,
      metadata: row.metadata as Record<string, unknown> | undefined,
      sessionId: row.session_id ?? undefined,
      tradingDate: row.trading_date ?? undefined,
    };
  },
};

// ============================================================================
// Interventions (append-only)
// ============================================================================

const toNumOrNull = (v: string | undefined): number | null => {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fromNumOrNull = (v: number | null): string | undefined =>
  v == null ? undefined : String(v);

export const interventionMapper = {
  table: "interventions" as const,
  toInsert(event: InterventionEvent, userId: string): InterventionInsert {
    return {
      user_id: userId,
      client_id: event.id,
      session_id: event.sessionId ?? null,
      behavior_event_id: event.behaviorEventId ?? null,
      trading_date: event.tradingDate ?? null,
      timestamp: event.timestamp,
      decision: event.decision,
      event_type: event.eventType,
      severity: event.severity,
      symbol: event.symbol ?? null,
      market_type: event.marketType ?? null,
      direction: event.direction ?? null,
      setup_type: event.setupType ?? null,
      entry_price: toNumOrNull(event.entryPrice),
      stop_price: toNumOrNull(event.stopPrice),
      target_price: toNumOrNull(event.targetPrice),
      position_size: event.positionSize ?? null,
      account_size: event.accountSize ?? null,
      total_risk: event.totalRisk ?? null,
      account_risk_percent: event.accountRiskPercent ?? null,
      reward_risk_ratio: event.rewardRiskRatio ?? null,
      validation_status: event.validationStatus ?? null,
      triggered_rules: event.triggeredRules as never,
      warning_count: event.warningCount ?? null,
      violation_count: event.violationCount ?? null,
      source: event.source ?? "trade_desk_intervention",
    };
  },
  fromRow(row: InterventionRow): InterventionEvent {
    return {
      id: row.client_id ?? row.id,
      timestamp: row.timestamp,
      decision: row.decision,
      eventType: row.event_type,
      severity: row.severity,
      symbol: row.symbol ?? undefined,
      marketType: row.market_type ?? undefined,
      direction: row.direction ?? undefined,
      setupType: row.setup_type ?? undefined,
      entryPrice: fromNumOrNull(row.entry_price),
      stopPrice: fromNumOrNull(row.stop_price),
      targetPrice: fromNumOrNull(row.target_price),
      positionSize: row.position_size,
      accountSize: row.account_size ?? undefined,
      totalRisk: row.total_risk,
      accountRiskPercent: row.account_risk_percent,
      rewardRiskRatio: row.reward_risk_ratio,
      validationStatus: row.validation_status ?? undefined,
      triggeredRules: (row.triggered_rules as TriggeredRule[]) ?? [],
      warningCount: row.warning_count ?? undefined,
      violationCount: row.violation_count ?? undefined,
      source: "trade_desk_intervention",
      behaviorEventId: row.behavior_event_id ?? undefined,
      sessionId: row.session_id ?? undefined,
      tradingDate: row.trading_date ?? undefined,
    };
  },
};

// ============================================================================
// Trade monitoring events (append-only)
// ============================================================================

export const monitoringEventMapper = {
  table: "trade_monitoring_events" as const,
  toInsert(
    event: MonitoringEvent,
    userId: string,
  ): TradeMonitoringEventInsert {
    return {
      user_id: userId,
      client_id: event.id,
      trade_id: event.tradeId,
      session_id: event.sessionId ?? null,
      trading_date: event.tradingDate ?? null,
      timestamp: event.timestamp,
      update: event.update as never,
      deviations: event.deviations as never,
      severity: event.severity,
      recommendations: event.recommendations as never,
    };
  },
  fromRow(row: TradeMonitoringEventRow): MonitoringEvent {
    return {
      id: row.client_id ?? row.id,
      tradeId: row.trade_id,
      timestamp: row.timestamp,
      update: row.update as MonitoringEvent["update"],
      deviations: (row.deviations as MonitoringEvent["deviations"]) ?? [],
      severity: row.severity,
      recommendations:
        (row.recommendations as MonitoringEvent["recommendations"]) ?? [],
      sessionId: row.session_id ?? undefined,
      tradingDate: row.trading_date ?? undefined,
    };
  },
};

// ============================================================================
// Session notes (append-only)
// ============================================================================

export const sessionNoteMapper = {
  table: "session_notes" as const,
  toInsert(note: SessionNote, userId: string): SessionNoteInsert {
    return {
      user_id: userId,
      client_id: note.id,
      session_id: note.sessionId ?? null,
      trading_date: note.tradingDate ?? null,
      content: note.content,
      category: note.category,
    };
  },
  fromRow(row: SessionNoteRow): SessionNote {
    return {
      id: row.client_id ?? row.id,
      createdAt: row.created_at,
      tradingDate: row.trading_date ?? undefined,
      sessionId: row.session_id ?? undefined,
      content: row.content,
      category: row.category,
    };
  },
};

// ============================================================================
// Daily reflections (mutable, upsert on user+trading_date)
// ============================================================================

export const dailyReflectionMapper = {
  table: "daily_reflections" as const,
  toUpsert(refl: DailyReflection, userId: string): DailyReflectionInsert {
    return {
      user_id: userId,
      session_id: refl.sessionId,
      trading_date: refl.tradingDate,
      answers: refl.answers as never,
      emotional_notes: refl.emotionalNotes,
      freeform_notes: refl.freeformNotes,
      summary: refl.summary as never,
      insight: refl.insight,
      tomorrow_focus: refl.tomorrowFocus,
      saved_at: refl.savedAt,
    };
  },
  fromRow(row: DailyReflectionRow): DailyReflection {
    return {
      id: row.id,
      tradingDate: row.trading_date,
      sessionId: row.session_id,
      savedAt: row.saved_at,
      answers: (row.answers as Record<string, string>) ?? {},
      emotionalNotes: row.emotional_notes,
      freeformNotes: row.freeform_notes,
      summary: row.summary as DailyReflection["summary"],
      insight: row.insight,
      tomorrowFocus: row.tomorrow_focus,
    };
  },
};

// ============================================================================
// Trade reflections (mutable, upsert on user+trade)
// ============================================================================

export const tradeReflectionMapper = {
  table: "trade_reflections" as const,
  toUpsert(refl: TradeReflection, userId: string): TradeReflectionInsert {
    return {
      user_id: userId,
      trade_id: refl.tradeId,
      trading_date: refl.tradingDate ?? null,
      answers: refl.answers as never,
      saved_at: refl.savedAt,
    };
  },
  fromRow(row: TradeReflectionRow): TradeReflection {
    return {
      id: row.id,
      tradeId: row.trade_id,
      savedAt: row.saved_at,
      tradingDate: row.trading_date ?? undefined,
      answers: (row.answers as Record<string, string>) ?? {},
    };
  },
};
