# StandFast App Store — Architecture Notes

The store at `src/store/` is the single source of truth for every piece of
domain state the app touches: user profile, onboarding progress, session
metrics, risk rules, trade desk inputs, behavior events, interventions, and
dashboard metrics.

Pages and components do **not** own business logic anymore. Logic lives in:

- **`src/lib/validation/trade-validation-engine.ts`** — the rule check + risk
  math engine (pure function, no I/O, no React).
- **Store slice actions** in `src/store/slices/*` — every mutation, every
  cross-slice transition (e.g. "check the trade, log the result, log the
  intervention if any") happens here.
- **Type-level utilities** in `src/types/` — defaults, migrators, Zod parsers.

## Directory layout

```
src/
├── types/                            ← canonical schemas (Zod + inferred TS)
│   ├── risk.ts                       (TradeDirection, MarketType, RiskCalculationResult)
│   ├── risk-rules.ts                 (RiskRules + defaults + legacy migrator)
│   ├── trade-plan.ts                 (TradeInput, TradePlan)
│   ├── session.ts                    (SessionMetrics)
│   ├── user-profile.ts               (UserProfile)
│   ├── behavior-event.ts             (BehaviorEvent, TriggeredRule)
│   ├── validation.ts                 (ValidationResult, RuleResult, RuleStatus, ValidationSeverity)
│   ├── intervention.ts               (InterventionEvent, InterventionDecision)
│   └── index.ts                      (barrel)
│
├── lib/storage/                      ← persistence helpers (storage I/O)
│   ├── storage-keys.ts               (SF_STORAGE_KEYS, SF_COOKIE_NAMES)
│   ├── persistence.ts                (saveState, loadState, clearState, resetDemoData)
│   └── index.ts                      (barrel)
│
├── lib/validation/                   ← pure engine
│   └── trade-validation-engine.ts    (validateTrade, UNCHECKED_RULES)
│
└── store/                            ← composed app store
    ├── slices/
    │   ├── user-slice.ts
    │   ├── onboarding-slice.ts
    │   ├── session-slice.ts
    │   ├── risk-rules-slice.ts
    │   ├── trade-desk-slice.ts       ← owns checkTrade + intervention thunks
    │   ├── behavior-events-slice.ts
    │   ├── interventions-slice.ts
    │   └── dashboard-metrics-slice.ts
    ├── types.ts                      (AppStore type, SliceCreator helper)
    ├── index.ts                      (useAppStore + persist middleware)
    └── README.md                     (this file)
```

## Store structure

The store is built with **Zustand** + the `persist` middleware. All slices
are composed into a single `AppStore` so cross-slice thunks (the validation
flow especially) can call sibling actions through a shared `get()`.

```
AppStore = UserSlice
         & OnboardingSlice
         & SessionSlice
         & RiskRulesSlice
         & TradeDeskSlice           ← cross-cuts session + rules + events
         & BehaviorEventsSlice
         & InterventionsSlice
         & DashboardMetricsSlice    ← lazy getter, derives from siblings
         & { _hasHydrated; _setHasHydrated }
```

### Slice responsibilities

| Slice | State | Owns |
| --- | --- | --- |
| `user` | `UserProfile` | sign-in identity, plan, selected markets |
| `onboarding` | `{ complete, currentStep, completedAt }` | flow progress + completion flag (kept in sync with `user.onboardingComplete`) |
| `session` | `SessionMetrics` | live daily counters consumed by the engine |
| `riskRules` | `RiskRules` | the trader's configured caps + behavioral toggles |
| `tradeDesk` | `tradeInput, validation, hasCheckedTrade, modalOpen, modalResults, validationHistory` | live trade form + validation thunks + modal state |
| `behaviorEvents` | `BehaviorEvent[]` | append-only canonical event log |
| `interventions` | `InterventionEvent[]` | narrower modal-decision stream |
| `dashboardMetrics` | getter `() => DashboardMetrics` | derived dashboard tile values |

### The validation thunk (`tradeDesk.checkTrade`)

Centralized in `trade-desk-slice.ts`. The page only calls `checkTrade()`;
everything below happens inside the slice action:

1. Pull `tradeInput`, `riskRules`, `session`, `behaviorEvents` from the store.
2. Call `validateTrade(...)` (the pure engine).
3. Set `validation` + push the result onto `validationHistory`.
4. If `canReceiveStandFastApproval`, emit a `TRADE_APPROVED` `BehaviorEvent`
   into `behaviorEvents` and return.
5. Otherwise open the modal (`modalOpen = true`, `modalResults = ruleResults`).

The downstream modal handler (`recordInterventionDecision`) emits both a
`BehaviorEvent` (for the full log) **and** an `InterventionEvent` (for the
intervention-focused stream), then closes the modal.

## Persistence flow

The persist middleware serializes a curated subset of the store —
`PersistedAppState` in `src/store/index.ts` — into a single localStorage
key (`sf_app_state`).

```
write path:
  any action → store update → persist middleware → sfStorage.setItem
            → saveState(SF_STORAGE_KEYS.appState, value)
            → localStorage.setItem("sf_app_state", JSON.stringify(value))

read path (hydration):
  client mount → persist middleware reads sf_app_state via sfStorage.getItem
              → loadState(SF_STORAGE_KEYS.appState)
              → JSON.parse(localStorage.getItem(...))
              → merge() callback splices persisted state into defaults
              → onRehydrateStorage → _setHasHydrated(true)
```

**Persisted slices**: `user`, `onboarding`, `riskRules`, `session`,
`behaviorEvents`, `interventions`, `validationHistory`, `tradeInput`.

**Not persisted** (recomputed on demand): `validation`, `hasCheckedTrade`,
`modalOpen`, `modalResults`, `dashboardMetrics()`.

### Legacy migration

The previous architecture used three separate keys: `sf_risk_rules`,
`sf_decision_log`, `sf_user_profile`. On first load after this refactor,
the `merge()` callback notices that `sf_app_state` doesn't exist yet,
reads each legacy key via `loadState(...)`, validates the contents with
their Zod schemas, splices them into the new unified shape, and then
**clears** the legacy keys. Users keep their settings + event history;
the next save lands in `sf_app_state` only.

## Hydration flow

Zustand's `persist` middleware hydrates **after** the initial client render
to avoid a hydration mismatch with the SSR'd HTML. Pages that depend on
persisted data should gate themselves on `_hasHydrated`:

```ts
const hasHydrated = useAppStore((s) => s._hasHydrated);
const rules = useAppStore((s) => s.riskRules);

useEffect(() => {
  if (!hasHydrated) return;
  // Now `rules` reflects the saved value, not the default.
}, [hasHydrated]);
```

The Trade Desk + Rules & Risk workspaces both use this pattern. Validation
is re-run after hydration so live risk numbers pick up the user's actual
saved rules.

## Schema responsibilities

`src/types/` is the canonical home for every domain shape:

- **Zod schemas + inferred TS types** are co-located (`riskRulesSchema` and
  `type RiskRules = z.infer<...>`). Callers usually only import the type;
  the schema is there for runtime validation on the persistence boundary.
- **Defaults** (`getDefaultRiskRules`, `getDefaultUserProfile`,
  `getDefaultSessionMetrics`) live next to their schemas so the store
  initializer and the reset helpers always agree.
- **Migrators** (`migrateLegacyRiskRules`) live next to the schema they
  produce.

Components and pages **never** define domain types inline. If a new shape
shows up in a feature, it gets added to `src/types/` and re-exported via
`src/types/index.ts`.

## Adding a new persisted slice

1. Define the slice's types in `src/types/<domain>.ts`.
2. Create `src/store/slices/<domain>-slice.ts` exporting `Slice` type +
   `createSlice` factory.
3. Add the slice to `AppStore` in `src/store/types.ts`.
4. Add to the `create(...)` call in `src/store/index.ts`.
5. Add the field to `PersistedAppState` + `partialize()` if it should
   survive reloads.
6. If migrating from an older key, add it to `SF_STORAGE_KEYS` and extend
   `readLegacySnapshot()`.
