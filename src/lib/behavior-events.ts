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
  TRADE_APPROVED: "trade_approved",
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
  [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED]: {
    displayTitle: "Trade approved manually",
    displayDescription: "All rule checks passed. Awaiting execution.",
    tone: "emerald",
    icon: CheckCircle2,
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
