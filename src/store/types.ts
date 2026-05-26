import type { StateCreator } from "zustand";

import type { UserSlice } from "@/store/slices/user-slice";
import type { OnboardingSlice } from "@/store/slices/onboarding-slice";
import type { SessionSlice } from "@/store/slices/session-slice";
import type { RiskRulesSlice } from "@/store/slices/risk-rules-slice";
import type { TradeDeskSlice } from "@/store/slices/trade-desk-slice";
import type { ActiveTradesSlice } from "@/store/slices/active-trades-slice";
import type { ClosedTradesSlice } from "@/store/slices/closed-trades-slice";
import type { MonitoringEventsSlice } from "@/store/slices/monitoring-events-slice";
import type { BehaviorEventsSlice } from "@/store/slices/behavior-events-slice";
import type { InterventionsSlice } from "@/store/slices/interventions-slice";
import type { SessionsSlice } from "@/store/slices/sessions-slice";

// Composed application state. Each slice contributes its own state + actions
// and they're merged into one store so cross-slice actions (e.g. checkTrade
// reads riskRules + session, writes behaviorEvents) can call sibling actions
// via `get()`.

export type AppStore = UserSlice &
  OnboardingSlice &
  SessionSlice &
  RiskRulesSlice &
  TradeDeskSlice &
  ActiveTradesSlice &
  ClosedTradesSlice &
  MonitoringEventsSlice &
  BehaviorEventsSlice &
  InterventionsSlice &
  SessionsSlice & {
    // Set by the persist middleware after rehydration. UI gates that depend
    // on persisted data should wait for this to avoid hydration-mismatch
    // flicker (saved value differs from server-rendered default).
    _hasHydrated: boolean;
    _setHasHydrated: (hydrated: boolean) => void;
  };

export type SliceCreator<T> = StateCreator<
  AppStore,
  [],
  [],
  T
>;
