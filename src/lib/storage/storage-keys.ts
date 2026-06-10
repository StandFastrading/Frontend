// Single source of truth for every localStorage key the app owns. Never
// hardcode "sf_..." strings elsewhere — import from here so the demo-reset
// helper and the persist middleware stay aligned.

export const SF_STORAGE_KEYS = {
  // Unified zustand app state. Replaces the per-domain legacy keys below.
  appState: "sf_app_state",

  // Durable outbound sync queue — pending Supabase writes waiting on retry.
  // See: src/lib/sync/ (Phase 3).
  syncQueue: "sf_sync_queue",

  // Legacy keys retained for first-load migration only. After a successful
  // migration the persistence helpers clear them. Do not write to these.
  legacyRiskRules: "sf_risk_rules",
  legacyDecisionLog: "sf_decision_log",
  legacyUserProfile: "sf_user_profile",
} as const;

export type SfStorageKey =
  (typeof SF_STORAGE_KEYS)[keyof typeof SF_STORAGE_KEYS];

// Every owned localStorage key, used by `resetDemoData()` to wipe state.
// Add new persisted keys above and they automatically participate.
export const ALL_SF_STORAGE_KEYS: readonly SfStorageKey[] = Object.values(
  SF_STORAGE_KEYS,
) as SfStorageKey[];
