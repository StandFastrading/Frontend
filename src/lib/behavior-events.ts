import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardList,
  Flag,
  LogOut,
  Move,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Scissors,
  TrendingDown,
  Timer,
  Layers,
  type LucideIcon,
} from "lucide-react";

// Canonical event-type vocabulary for the entire app. Trade Desk produces
// events today; Journal, Reports, and Behavior Analytics will consume them.
// Treat the string values as stable wire identifiers — once written to the
// decision log or sent to a backend, they should never change.

export const BEHAVIOR_EVENT_TYPES = {
  TRADE_PLAN_STARTED: "trade_plan_started",
  RISK_CHECKED: "risk_checked",
  WARNING_TRIGGERED: "warning_triggered",
  WARNING_IGNORED: "warning_ignored",
  TRADE_REVISION_STARTED: "trade_revision_started",
  TRADE_REVISED: "trade_revised",
  TRADE_AVOIDED: "trade_avoided",
  // Emitted when the trader clears the form AFTER having evaluated the
  // plan (Check Trade ran). A pre-evaluation clear is a silent reset —
  // no event — because nothing of behavioral value has happened yet.
  // PLAN_ABANDONED is a positive behavioral signal: the trader evaluated
  // and chose not to proceed. Distinct from TRADE_AVOIDED, which is
  // dispatched from the rule-check modal's Cancel Trade path.
  PLAN_ABANDONED: "plan_abandoned",
  TRADE_APPROVED: "trade_approved",
  TRADE_MARKED_ACTIVE: "trade_marked_active",
  // Granular active-trade monitoring vocabulary. Behavior Deviation Engine
  // emits these — they describe *what kind of deviation* happened, not just
  // *that* the trader moved a stop / added size. Persisted as wire values.
  STOP_MOVED_FURTHER: "stop_moved_further",
  STOP_TIGHTENED: "stop_tightened",
  // V1.5 — emitted on Move Target. Target moves aren't deviations
  // (extending profit is often disciplined behavior), so the deviation
  // engine produces no warnings. The event is captured purely for
  // behavioral-decision history; future analytics can score target-
  // management quality from the persisted `reason` metadata.
  TARGET_MOVED: "target_moved",
  POSITION_SIZE_INCREASED: "position_size_increased",
  RISK_EXPOSURE_INCREASED: "risk_exposure_increased",
  AVERAGING_DOWN_DETECTED: "averaging_down_detected",
  EXCESSIVE_ADDS_DETECTED: "excessive_adds_detected",
  REWARD_RISK_DEGRADED: "reward_risk_degraded",
  RAPID_POST_LOSS_REACTIVATION: "rapid_post_loss_reactivation",
  BEHAVIORAL_MISTAKE_LOGGED: "behavioral_mistake_logged",
  PARTIAL_EXIT_LOGGED: "partial_exit_logged",
  TRADE_EXIT_LOGGED: "trade_exit_logged",
  TRADE_CLOSED: "trade_closed",
  TRADE_EXIT_REFLECTION_ADDED: "trade_exit_reflection_added",
  // Trader chose Continue Anyway on a *warning-only* check (no hard fails).
  // The trade still activates, but the override is one of the highest-value
  // behavioral signals StandFast captures — split out from WARNING_IGNORED
  // so Behavior Analytics can score warning-overrides distinctly from
  // fail-overrides.
  TRADE_OVERRIDE_ACCEPTED: "trade_override_accepted",
  // Legacy / generic event types — kept for backward compatibility with
  // older persisted records. New code emits the granular types above.
  TRADE_EXITED: "trade_exited",
  STOP_MOVED: "stop_moved",
  POSITION_ADDED: "position_added",
  MISTAKE_MARKED: "mistake_marked",
} as const;

export type BehaviorEventType =
  (typeof BEHAVIOR_EVENT_TYPES)[keyof typeof BEHAVIOR_EVENT_TYPES];

export type BehaviorEventTone = "brand" | "emerald" | "amber" | "rose";

export type BehaviorEventDisplay = {
  // User-facing display labels — distinct from the eventType wire value so
  // wording can be polished without breaking persisted records.
  displayTitle: string;
  displayDescription: string;
  tone: BehaviorEventTone;
  icon: LucideIcon;
};

export const BEHAVIOR_EVENT_DISPLAY: Record<
  BehaviorEventType,
  BehaviorEventDisplay
> = {
  [BEHAVIOR_EVENT_TYPES.TRADE_PLAN_STARTED]: {
    displayTitle: "Trade plan started",
    displayDescription: "Symbol entered, plan in progress.",
    tone: "brand",
    icon: ClipboardList,
  },
  [BEHAVIOR_EVENT_TYPES.RISK_CHECKED]: {
    displayTitle: "Risk checked",
    displayDescription: "Live preview rendered for stocks setup.",
    tone: "emerald",
    icon: ShieldCheck,
  },
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: {
    displayTitle: "Warning triggered",
    displayDescription: "Trade plan is shorter than recommended.",
    tone: "amber",
    icon: AlertTriangle,
  },
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: {
    displayTitle: "Warning ignored",
    displayDescription: "Trader proceeded despite a rule check warning.",
    tone: "rose",
    icon: ShieldOff,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_REVISION_STARTED]: {
    displayTitle: "Trade revision started",
    displayDescription: "Trader returned to the plan to revise inputs.",
    tone: "amber",
    icon: RefreshCw,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_REVISED]: {
    displayTitle: "Trade revised",
    displayDescription: "Stop tightened to lower account risk.",
    tone: "brand",
    icon: RefreshCw,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED]: {
    displayTitle: "Trade avoided",
    displayDescription: "Trader canceled the setup after intervention.",
    tone: "emerald",
    icon: Ban,
  },
  [BEHAVIOR_EVENT_TYPES.PLAN_ABANDONED]: {
    displayTitle: "Plan abandoned",
    displayDescription:
      "Trader cleared the form after evaluation without activating the trade.",
    tone: "emerald",
    icon: Ban,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED]: {
    displayTitle: "Trade approved manually",
    displayDescription: "All rule checks passed. Awaiting execution.",
    tone: "emerald",
    icon: CheckCircle2,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE]: {
    displayTitle: "Trade activated",
    displayDescription: "Trader manually confirmed the position was entered.",
    tone: "brand",
    icon: CheckCircle2,
  },
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: {
    displayTitle: "Stop widened beyond approved risk",
    displayDescription:
      "Stop moved past the original invalidation level — deviation detected.",
    tone: "rose",
    icon: Move,
  },
  [BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED]: {
    displayTitle: "Stop tightened",
    displayDescription: "Stop moved closer to entry to reduce account risk.",
    tone: "emerald",
    icon: Move,
  },
  [BEHAVIOR_EVENT_TYPES.TARGET_MOVED]: {
    displayTitle: "Target moved",
    displayDescription:
      "Target price updated — decision context captured for behavioral history.",
    tone: "brand",
    icon: Move,
  },
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: {
    displayTitle: "Position size exceeds approved amount",
    displayDescription:
      "Added size past the originally approved position — review recommended.",
    tone: "amber",
    icon: PlusCircle,
  },
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: {
    displayTitle: "Total risk exceeds approval",
    displayDescription:
      "Total dollar risk on the trade is now above the approved level.",
    tone: "rose",
    icon: TrendingDown,
  },
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: {
    displayTitle: "Add placed against position",
    displayDescription:
      "Position added in the adverse direction of the original invalidation.",
    tone: "rose",
    icon: Layers,
  },
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: {
    displayTitle: "Adds exceed configured cap",
    displayDescription:
      "Add count is past your Rules & Risk cap — review recommended.",
    tone: "rose",
    icon: Layers,
  },
  [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: {
    displayTitle: "Reward:risk below approved minimum",
    displayDescription:
      "Update pushed reward:risk below the originally approved ratio.",
    tone: "amber",
    icon: TrendingDown,
  },
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: {
    displayTitle: "Re-entry within post-loss window",
    displayDescription:
      "New trade marked active inside the post-loss cool-off window.",
    tone: "rose",
    icon: Timer,
  },
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: {
    displayTitle: "Mistake logged",
    displayDescription: "Trader flagged this trade for review.",
    tone: "rose",
    icon: Flag,
  },
  [BEHAVIOR_EVENT_TYPES.PARTIAL_EXIT_LOGGED]: {
    displayTitle: "Partial exit logged",
    displayDescription: "Position partially reduced — exposure decreased.",
    tone: "brand",
    icon: Scissors,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_EXIT_LOGGED]: {
    displayTitle: "Trade exit logged",
    displayDescription: "Position closed and archived.",
    tone: "brand",
    icon: LogOut,
  },
  // Headline trade-closed event — the title is rewritten at emit time to
  // include the realized outcome ("Winning trade closed", "Losing trade
  // closed", "Breakeven trade closed") and the description carries the
  // realized R + P/L. These defaults are only seen if a closed-trade event
  // is ever emitted without the outcome-specific override.
  [BEHAVIOR_EVENT_TYPES.TRADE_CLOSED]: {
    displayTitle: "Trade closed",
    displayDescription: "Position closed and archived.",
    tone: "brand",
    icon: LogOut,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED]: {
    displayTitle: "Exit reflection added",
    displayDescription: "Trader recorded a note on the closed trade.",
    tone: "brand",
    icon: ClipboardList,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: {
    displayTitle: "Trade activated with acknowledged warnings",
    displayDescription:
      "Trade proceeded after behavioral/risk warnings were acknowledged.",
    tone: "amber",
    icon: ShieldOff,
  },
  [BEHAVIOR_EVENT_TYPES.TRADE_EXITED]: {
    displayTitle: "Trade exited",
    displayDescription: "Position closed and logged.",
    tone: "brand",
    icon: LogOut,
  },
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED]: {
    displayTitle: "Stop moved",
    displayDescription: "Stop level updated on the active trade.",
    tone: "amber",
    icon: Move,
  },
  [BEHAVIOR_EVENT_TYPES.POSITION_ADDED]: {
    displayTitle: "Position added",
    displayDescription: "Additional size added to the active trade.",
    tone: "brand",
    icon: PlusCircle,
  },
  [BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED]: {
    displayTitle: "Mistake marked",
    displayDescription: "Trader flagged this trade as a mistake for review.",
    tone: "rose",
    icon: Flag,
  },
};

// Tiny convenience getter so callers don't need to know the underlying map.
export function getBehaviorEventDisplay(
  type: BehaviorEventType,
): BehaviorEventDisplay {
  return BEHAVIOR_EVENT_DISPLAY[type];
}
