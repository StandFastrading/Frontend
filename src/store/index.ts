"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

import {
  SF_STORAGE_KEYS,
  loadState,
  clearState,
  saveState,
} from "@/lib/storage";
import {
  getDefaultRiskRules,
  migrateActiveTrade,
  migrateLegacyRiskRules,
  riskRulesSchema,
  behaviorEventSchema,
  userProfileSchema,
  type ActiveTrade,
  type BehaviorEvent,
  type ClosedTrade,
  type MonitoringEvent,
  type RiskRules,
  type TradingSession,
  type UserProfile,
} from "@/types";

import {
  createActiveTradesSlice,
  type ActiveTradesSlice,
} from "@/store/slices/active-trades-slice";
import {
  createSessionsSlice,
  type SessionsSlice,
} from "@/store/slices/sessions-slice";
import {
  createClosedTradesSlice,
  type ClosedTradesSlice,
} from "@/store/slices/closed-trades-slice";
import {
  createMonitoringEventsSlice,
  type MonitoringEventsSlice,
} from "@/store/slices/monitoring-events-slice";
import {
  createBehaviorEventsSlice,
  type BehaviorEventsSlice,
} from "@/store/slices/behavior-events-slice";
import {
  createInterventionsSlice,
  type InterventionsSlice,
} from "@/store/slices/interventions-slice";
import {
  createOnboardingSlice,
  type OnboardingSlice,
} from "@/store/slices/onboarding-slice";
import {
  createRiskRulesSlice,
  type RiskRulesSlice,
} from "@/store/slices/risk-rules-slice";
import {
  createSessionSlice,
  type SessionSlice,
} from "@/store/slices/session-slice";
import {
  createTradeDeskSlice,
  type TradeDeskSlice,
} from "@/store/slices/trade-desk-slice";
import {
  createUserSlice,
  type UserSlice,
} from "@/store/slices/user-slice";
import { createReflectionsSlice } from "@/store/slices/reflections-slice";
import type {
  DailyReflection,
  NoteDraft,
  ReflectionDraft,
  SessionNote,
  TradeReflection,
} from "@/types";
import type { AppStore } from "@/store/types";

// `PersistedAppState` is the subset of the store that survives reloads.
// Lazy/derived state (validation, modal, dashboardMetrics getter) is left
// out intentionally — those are computed from persisted slices on demand.
type PersistedAppState = {
  user: UserProfile;
  onboarding: OnboardingSlice["onboarding"];
  riskRules: RiskRules;
  session: SessionSlice["session"];
  behaviorEvents: BehaviorEvent[];
  interventions: InterventionsSlice["interventions"];
  validationHistory: TradeDeskSlice["validationHistory"];
  tradeInput: TradeDeskSlice["tradeInput"];
  activeTrades: ActiveTrade[];
  closedTrades: ClosedTrade[];
  monitoringEvents: MonitoringEvent[];
  sessions: TradingSession[];
  activeSessionId: string | null;
  // Journal artifacts. Reflections are deduped per trading date; notes
  // are freeform append-only. Trade reflections are deduped per
  // tradeId. None of these are touched by `resetTodaysSession`.
  reflections: DailyReflection[];
  sessionNotes: SessionNote[];
  tradeReflections: TradeReflection[];
  // Auto-save drafts — written by useAutoSave on debounce; cleared by
  // finalize. Persisted so a tab switch or browser reload doesn't lose
  // in-progress writing.
  reflectionDrafts: Record<string, ReflectionDraft>;
  noteDraft: NoteDraft | null;
};

// Custom storage adapter — wraps the typed @/lib/storage helpers so the
// persist middleware reads/writes through the same JSON IO surface as
// every other consumer. Means demo-reset only has to clear one source.
const sfStorage: PersistStorage<PersistedAppState> = {
  getItem: (key) => {
    const raw = loadState<unknown>(key);
    return raw === undefined ? null : (raw as { state: PersistedAppState; version: number });
  },
  setItem: (key, value) => {
    saveState(key, value);
  },
  removeItem: (key) => {
    clearState(key);
  },
};

// On first load (no sf_app_state yet), reach into the legacy per-domain
// keys and seed the new unified state. Avoids losing the user's existing
// settings / event log when this refactor ships.
function readLegacySnapshot(): Partial<PersistedAppState> | null {
  const legacyRules = loadState<unknown>(SF_STORAGE_KEYS.legacyRiskRules);
  const legacyLog = loadState<unknown>(SF_STORAGE_KEYS.legacyDecisionLog);
  const legacyProfile = loadState<unknown>(SF_STORAGE_KEYS.legacyUserProfile);

  if (!legacyRules && !legacyLog && !legacyProfile) return null;

  const out: Partial<PersistedAppState> = {};
  if (legacyRules) {
    const migrated = migrateLegacyRiskRules(legacyRules);
    const merged = { ...getDefaultRiskRules(), ...(migrated as object) };
    const parsed = riskRulesSchema.safeParse(merged);
    if (parsed.success) out.riskRules = parsed.data;
  }
  if (Array.isArray(legacyLog)) {
    const events = legacyLog
      .map((entry) => behaviorEventSchema.safeParse(entry))
      .filter(
        (r): r is { success: true; data: BehaviorEvent } => r.success,
      )
      .map((r) => r.data);
    if (events.length > 0) out.behaviorEvents = events;
  }
  if (legacyProfile) {
    const parsed = userProfileSchema.safeParse(legacyProfile);
    if (parsed.success) out.user = parsed.data;
  }
  return out;
}

function dropLegacyKeys() {
  clearState(SF_STORAGE_KEYS.legacyRiskRules);
  clearState(SF_STORAGE_KEYS.legacyDecisionLog);
  clearState(SF_STORAGE_KEYS.legacyUserProfile);
}

// v1 reflection drafts were keyed by trading date. v2 re-keys by
// session id so a session reset no longer pollutes the new session
// with the prior session's in-progress text. Each entry is re-anchored
// under its embedded `sessionId`; entries without a sessionId are
// dropped (no honest way to attribute them).
function migrateReflectionDraftsV1ToV2(
  legacy: unknown,
): Record<string, ReflectionDraft> {
  if (!legacy || typeof legacy !== "object") return {};
  const out: Record<string, ReflectionDraft> = {};
  for (const value of Object.values(legacy as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const sessionId = typeof v.sessionId === "string" ? v.sessionId : null;
    if (!sessionId) continue;
    const tradingDate =
      typeof v.tradingDate === "string" ? v.tradingDate : null;
    if (!tradingDate) continue;
    const updatedAt =
      typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString();
    const answers =
      v.answers && typeof v.answers === "object"
        ? (v.answers as Record<string, string>)
        : {};
    const emotionalNotes =
      typeof v.emotionalNotes === "string" ? v.emotionalNotes : "";
    const freeformNotes =
      typeof v.freeformNotes === "string" ? v.freeformNotes : "";
    out[sessionId] = {
      id:
        typeof v.id === "string"
          ? v.id
          : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      tradingDate,
      answers,
      emotionalNotes,
      freeformNotes,
      createdAt: typeof v.createdAt === "string" ? v.createdAt : updatedAt,
      updatedAt,
    };
  }
  return out;
}

// Single composed store. Each slice is independently testable; cross-slice
// actions (like `checkTrade` reading riskRules + session and writing
// behaviorEvents) hop between them via the shared `get()` closure.
export const useAppStore = create<AppStore>()(
  persist(
    (set, get, api) => ({
      ...createUserSlice(set, get, api),
      ...createOnboardingSlice(set, get, api),
      ...createSessionSlice(set, get, api),
      ...createRiskRulesSlice(set, get, api),
      ...createBehaviorEventsSlice(set, get, api),
      ...createInterventionsSlice(set, get, api),
      ...createSessionsSlice(set, get, api),
      ...createActiveTradesSlice(set, get, api),
      ...createClosedTradesSlice(set, get, api),
      ...createMonitoringEventsSlice(set, get, api),
      ...createTradeDeskSlice(set, get, api),
      ...createReflectionsSlice(set, get, api),
      _hasHydrated: false,
      _setHasHydrated: (hydrated) =>
        set(() => ({ _hasHydrated: hydrated })),
      userId: null,
      _setUserId: (userId) => set(() => ({ userId })),
    }),
    {
      name: SF_STORAGE_KEYS.appState,
      storage: sfStorage,
      version: 2,
      // Persist only the slices that should survive a refresh. Validation,
      // modal state, and the derived dashboard metrics are intentionally
      // omitted — they're recomputed on demand.
      partialize: (state) =>
        ({
          user: state.user,
          onboarding: state.onboarding,
          riskRules: state.riskRules,
          session: state.session,
          behaviorEvents: state.behaviorEvents,
          interventions: state.interventions,
          validationHistory: state.validationHistory,
          tradeInput: state.tradeInput,
          activeTrades: state.activeTrades,
          closedTrades: state.closedTrades,
          monitoringEvents: state.monitoringEvents,
          sessions: state.sessions,
          activeSessionId: state.activeSessionId,
          reflections: state.reflections,
          sessionNotes: state.sessionNotes,
          tradeReflections: state.tradeReflections,
          reflectionDrafts: state.reflectionDrafts,
          noteDraft: state.noteDraft,
        }) satisfies PersistedAppState,
      // Persist version migrations. v1 → v2 rewrites `reflectionDrafts`
      // from `Record<tradingDate, draft>` to `Record<sessionId, draft>`
      // so drafts no longer auto-load into the wrong session.
      //
      // For each legacy entry:
      //   * If it carries a sessionId, re-key under that sessionId,
      //     backfill `id` + `createdAt = updatedAt` to match the new
      //     schema, and keep it recoverable.
      //   * If it has no sessionId (legacy pre-session-boundary write),
      //     drop it — there's no honest way to attribute it to a session.
      migrate: (state, fromVersion) => {
        const s = (state ?? {}) as Record<string, unknown>;
        if (fromVersion < 2) {
          s.reflectionDrafts = migrateReflectionDraftsV1ToV2(s.reflectionDrafts);
        }
        return s as unknown as PersistedAppState;
      },
      // Runs on the client right before persisted state is merged in. If no
      // unified state exists yet, pull from the legacy per-domain keys and
      // promote them into the new shape, then drop the legacy keys.
      merge: (persisted, current) => {
        if (persisted) {
          const p = persisted as Partial<AppStore>;
          // Backfill any older activeTrade records that pre-date the
          // current-state / mistake / exit fields. Records that can't be
          // migrated at all (missing baseline) OR that carry a closed
          // status are dropped, so:
          //   1. The UI can't crash on a half-formed object.
          //   2. A closed record can never resurrect in the Active Trade
          //      Monitoring panel — the archive in `closedTrades` is the
          //      sole post-exit representation.
          if (Array.isArray(p.activeTrades)) {
            p.activeTrades = p.activeTrades
              .map((t) => migrateActiveTrade(t))
              .filter(
                (t): t is ActiveTrade => t != null && t.status === "active",
              );
          }
          return { ...current, ...p };
        }
        if (typeof window === "undefined") return current;
        const legacy = readLegacySnapshot();
        if (legacy) {
          dropLegacyKeys();
          return { ...current, ...legacy };
        }
        return current;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state._setHasHydrated(true);
        // Boundary system: open a fresh session whenever the persisted
        // state has no active session for today (first install, returning
        // user past midnight, or after Reset Demo Data). Historical events
        // stay where they are; current-session views just filter against
        // the new session id.
        state.ensureSessionForToday();
      },
    },
  ),
);

// Re-export slice + store types for consumers that want strong typing on
// selectors without importing from internal paths.
export type {
  AppStore,
  ActiveTradesSlice,
  ClosedTradesSlice,
  SessionsSlice,
  MonitoringEventsSlice,
  BehaviorEventsSlice,
  InterventionsSlice,
  OnboardingSlice,
  RiskRulesSlice,
  SessionSlice,
  TradeDeskSlice,
  UserSlice,
};

// Public reset helper. Exposed here (rather than at the slice level) because
// it has to span every slice — used by demo-reset and the future sign-out
// flow. Clears persisted state then re-runs each slice's initializer.
export function resetAppState() {
  useAppStore.persist.clearStorage();
  useAppStore.setState((state) => ({
    ...state,
    // re-run each slice to get its initial state back without losing the
    // bound action closures
  }));
  // Simplest reliable path: rebuild the entire store. Forces re-hydrate.
  useAppStore.setState(useAppStore.getInitialState(), true);
}

// Server hydration. Called once on the client by <StoreHydrator> right after
// the dashboard server component fetches the seed payload. Each non-null
// field on the payload overlays the corresponding slice; missing/empty
// fields leave the persisted local state alone.
//
// Server is the source of truth — if a row exists on the server, its shape
// wins over whatever the local cache had. The sync queue's pending writes
// flush after this, so any local-only edits that hadn't reached the server
// yet get pushed up.
import type { ServerSeedPayload } from "@/lib/sync/hydrate";
import {
  behaviorEventMapper,
  dailyReflectionMapper,
  interventionMapper,
  monitoringEventMapper,
  profileMapper,
  riskRulesMapper,
  sessionNoteMapper,
  tradeMapper,
  tradeReflectionMapper,
  tradingSessionMapper,
} from "@/lib/sync/mappers";

export function hydrateFromServer(seed: ServerSeedPayload) {
  useAppStore.setState((state) => {
    const patch: Partial<AppStore> = {};

    if (seed.profile) {
      patch.user = profileMapper.fromRow(seed.profile);
    }
    if (seed.riskRules) {
      patch.riskRules = riskRulesMapper.fromRow(seed.riskRules);
    }
    if (seed.sessions.length > 0) {
      patch.sessions = seed.sessions.map((s) =>
        tradingSessionMapper.fromRow(s),
      );
      patch.activeSessionId = seed.activeSession?.client_id ?? null;
    }
    if (seed.activeTrades.length > 0) {
      patch.activeTrades = seed.activeTrades.map((r) =>
        tradeMapper.tradeRowToActive(r),
      );
    }
    if (seed.closedTrades.length > 0) {
      patch.closedTrades = seed.closedTrades.map((r) =>
        tradeMapper.tradeRowToClosed(r),
      );
    }
    if (seed.behaviorEvents.length > 0) {
      patch.behaviorEvents = seed.behaviorEvents.map((r) =>
        behaviorEventMapper.fromRow(r),
      );
    }
    if (seed.interventions.length > 0) {
      patch.interventions = seed.interventions.map((r) =>
        interventionMapper.fromRow(r),
      );
    }
    if (seed.monitoringEvents.length > 0) {
      patch.monitoringEvents = seed.monitoringEvents.map((r) =>
        monitoringEventMapper.fromRow(r),
      );
    }
    if (seed.reflections.length > 0) {
      patch.reflections = seed.reflections.map((r) =>
        dailyReflectionMapper.fromRow(r),
      );
    }
    if (seed.tradeReflections.length > 0) {
      patch.tradeReflections = seed.tradeReflections.map((r) =>
        tradeReflectionMapper.fromRow(r),
      );
    }
    if (seed.sessionNotes.length > 0) {
      patch.sessionNotes = seed.sessionNotes.map((r) =>
        sessionNoteMapper.fromRow(r),
      );
    }

    return { ...state, ...patch };
  });
}
