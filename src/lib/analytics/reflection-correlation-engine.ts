import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
  type TimeframeDefinition,
} from "@/lib/analytics/timeframe";
import {
  sessionsInWindow,
  type AnalyticsSliceInputs,
} from "@/lib/analytics/trend-series";
import type {
  BehaviorEvent,
  ClosedTrade,
  DailyReflection,
  InterventionEvent,
  MonitoringEvent,
  SessionNote,
  TradeReflection,
} from "@/types";

// =============================================================================
// Reflection Correlation Engine — rules-based, deterministic, NOT AI
// =============================================================================
//
// PURPOSE
//   Pair self-reported reflection language with observed trading behavior
//   so the dashboard can answer process-grounded questions like:
//
//     * "What emotional language appears before deterioration?"
//     * "Does the journal language match the observed session?"
//     * "What themes appear before stop widening?"
//
//   The engine is NOT a diagnosis. Reflection language is treated as
//   self-reported context — one input layer compared against observed
//   events, never elevated to certainty.
//
// PIPELINE
//   1. Sources: DailyReflection (answers + emotional notes + freeform
//      notes), TradeReflection (answers), SessionNote (content).
//   2. Per source, extract themes by normalized substring / word-boundary
//      matches against a hand-curated keyword dictionary. No NLP, no AI.
//   3. Pair the source's themes with the session's (or trade's) observed
//      behavioral context: stop widenings, overrides, deteriorations,
//      escalations, rule adherence band, recurring patterns.
//   4. Derive an alignment status (aligned | contradicted | unclear) per
//      source — does the reflection language match the observed events?
//   5. Aggregate across the timeframe to produce ThemeCorrelation cards
//      and a small alignment ratio.
//
// AI-READY DATA SHAPES
//   The records emitted here (ReflectionThemeOccurrence,
//   ReflectionBehaviorAlignment, ThemeCorrelation) are all stamped with
//   traderId + sessionId + sourceType + sourceId + linkedBehavior*. A
//   future retrieval layer can pattern-match queries like:
//
//     - "Show me reflections where urgency preceded stop widening."
//     - "What emotional language appears before overrides?"
//     - "Where did the trader say they followed the plan but the
//        behavior disagreed?"
//
//   None of that retrieval is built yet. The shapes are the contract.
// =============================================================================

// -----------------------------------------------------------------------------
// Theme dictionary — single source of truth
// -----------------------------------------------------------------------------

export const REFLECTION_THEME_KEYS = [
  "urgency",
  "revenge",
  "frustration",
  "fomo",
  "fear",
  "overconfidence",
  "boredom",
  "discipline",
  "conviction",
  "confusion",
] as const;
export type ReflectionThemeKey = (typeof REFLECTION_THEME_KEYS)[number];

export const REFLECTION_THEME_LABEL: Record<ReflectionThemeKey, string> = {
  urgency: "Urgency",
  revenge: "Revenge",
  frustration: "Frustration",
  fomo: "FOMO",
  fear: "Fear",
  overconfidence: "Overconfidence",
  boredom: "Boredom",
  discipline: "Discipline",
  conviction: "Conviction",
  confusion: "Confusion",
};

// Themes the trader claims when describing CONTROLLED behavior. If
// observed events show deterioration, the claim is contradicted.
const CONTROL_CLAIM_THEMES = new Set<ReflectionThemeKey>([
  "discipline",
  "conviction",
]);

// Themes the trader uses when SELF-IDENTIFYING emotional pressure. When
// observed events show deterioration, this is self-awareness matching
// behavior; when observed events are clean, it's a flag the trader
// felt pressure but stayed in process.
const PRESSURE_THEMES = new Set<ReflectionThemeKey>([
  "urgency",
  "revenge",
  "frustration",
  "fomo",
  "fear",
  "overconfidence",
  "boredom",
]);

// Keyword list per theme. Multi-word entries are matched as case-insensitive
// substrings; single-word entries are matched at word boundaries so e.g.
// "win" does not match "winning".
const THEME_KEYWORDS: Record<ReflectionThemeKey, string[]> = {
  urgency: [
    "rushed",
    "rushing",
    "chased",
    "chasing",
    "had to get in",
    "didn't want to miss",
    "hurry",
    "hurried",
    "pressured",
    "pressure",
  ],
  revenge: [
    "revenge",
    "make it back",
    "get it back",
    "win it back",
    "get even",
    "force it",
    "forced it",
    "recover",
  ],
  frustration: [
    "frustrated",
    "frustration",
    "mad",
    "angry",
    "annoyed",
    "irritated",
    "tilted",
    "tilt",
  ],
  fomo: [
    "fomo",
    "missed it",
    "didn't want to miss",
    "everyone was in",
    "missing out",
    "jumped in",
  ],
  fear: [
    "scared",
    "afraid",
    "nervous",
    "hesitant",
    "didn't trust",
    "anxious",
    "anxiety",
  ],
  overconfidence: [
    "knew it would work",
    "sure thing",
    "couldn't fail",
    "easy money",
    "felt obvious",
    "overconfident",
  ],
  boredom: [
    "bored",
    "boring",
    "slow market",
    "nothing moving",
    "forced trade",
    "forced a trade",
  ],
  discipline: [
    "followed plan",
    "followed the plan",
    "respected stop",
    "respected the stop",
    "stayed patient",
    "patient",
    "patience",
    "disciplined",
    "stuck to plan",
    "stuck to the plan",
    "waited",
    "controlled",
  ],
  conviction: [
    "clear setup",
    "valid setup",
    "good signal",
    "confirmed",
    "according to plan",
    "high conviction",
  ],
  confusion: [
    "unsure",
    "unclear",
    "didn't know",
    "guessing",
    "no plan",
    "confused",
    "confusing",
  ],
};

// Pre-compile regex per keyword once.
const COMPILED_THEME_PATTERNS: Record<ReflectionThemeKey, RegExp[]> =
  (() => {
    const out = {} as Record<ReflectionThemeKey, RegExp[]>;
    for (const theme of REFLECTION_THEME_KEYS) {
      out[theme] = THEME_KEYWORDS[theme].map((kw) => {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const isPhrase = kw.includes(" ");
        return isPhrase
          ? new RegExp(escaped, "i")
          : new RegExp(`\\b${escaped}\\b`, "i");
      });
    }
    return out;
  })();

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type ReflectionSourceType =
  | "dailyReflection"
  | "tradeReflection"
  | "note"
  | "emotionalNote";

export type ReflectionAlignmentStatus =
  | "aligned"
  | "contradicted"
  | "unclear";

// Per-reflection theme extraction — one row per (source, theme).
export type ReflectionThemeOccurrence = {
  id: string;
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  sourceType: ReflectionSourceType;
  sourceId: string;
  theme: ReflectionThemeKey;
  matchedKeywords: string[];
  createdAt: string;
};

// Snapshot of the behavioral context attached to a source. Same shape
// whether the source is a session reflection or a single-trade reflection.
export type ReflectionLinkedBehavior = {
  stopWidenings: number;
  warningOverrides: number;
  rapidReentries: number;
  sizeIncreases: number;
  mistakesLogged: number;
  escalationsObserved: number;
  cleanTradeCount: number;
  destructiveEventCount: number;
  // Intervention outcomes inside the same session window.
  cancelCount: number;
  reviseCount: number;
  continueAnywayCount: number;
};

// One row per reflection source — captures the alignment / contradiction
// signal between the reflection's themes and the observed behavior.
export type ReflectionBehaviorAlignment = {
  id: string;
  traderId: string;
  sessionId: string | null;
  tradeId: string | null;
  sourceType: ReflectionSourceType;
  sourceId: string;
  createdAt: string;
  themes: ReflectionThemeKey[];
  matchedKeywords: string[];
  linkedBehavior: ReflectionLinkedBehavior;
  // The session's behavioral state label at the time the reflection was
  // saved. Pulled from the persisted reflection snapshot when available;
  // null for trade reflections / notes that don't carry one.
  linkedSessionState: string | null;
  alignmentStatus: ReflectionAlignmentStatus;
  alignmentExplanation: string;
};

// Aggregated theme rollup for one timeframe.
export type ThemeCorrelation = {
  theme: ReflectionThemeKey;
  label: string;
  occurrences: number;
  sessionsAffected: number;
  tradesAffected: number;
  // Confidence band per the spec: low 1-2, moderate 3-5, high 6+. Maps
  // onto the canonical ConfidenceLevel so it composes with the rest of
  // the analytics surface.
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  // Behavioral co-occurrence inside the sessions where this theme appeared.
  deteriorationRate: number; // % of those sessions where deterioration occurred
  cleanRate: number; // % of those sessions that ended clean
  ruleBreakRate: number; // % of those sessions with stop widening or warning override
  linkedBehaviorTypes: string[]; // BEHAVIOR_EVENT_TYPES strings co-occurring
  // Supporting ids — future AI retrieval.
  supportingSessionIds: string[];
  supportingTradeIds: string[];
  supportingSourceIds: string[];
};

export type ReflectionCorrelationSummary = {
  traderId: string;
  timeframeId: string;
  timeframeLabel: string;
  reflectionSourceCount: number;
  themeOccurrenceCount: number;
  themeCorrelations: ThemeCorrelation[];
  alignments: ReflectionBehaviorAlignment[];
  // Highlights driving the section's cards.
  mostFrequentTheme: ThemeCorrelation | null;
  themeMostLinkedToDeterioration: ThemeCorrelation | null;
  themesLinkedToCleanSessions: ThemeCorrelation[];
  themesLinkedToRuleBreaks: ThemeCorrelation[];
  alignmentRatio: { aligned: number; contradicted: number; unclear: number };
  // Sample-size awareness for the section-level confidence pill.
  sectionConfidence: ConfidenceLevel;
  sectionConfidenceLabel: string;
};

// -----------------------------------------------------------------------------
// Theme extraction — public helper for journal surfaces that want to
// render small theme chips next to a saved reflection.
// -----------------------------------------------------------------------------

export type ExtractedTheme = {
  theme: ReflectionThemeKey;
  label: string;
  matchedKeywords: string[];
};

export function extractThemes(input: string): ExtractedTheme[] {
  const text = input.trim();
  if (!text) return [];
  const out: ExtractedTheme[] = [];
  for (const theme of REFLECTION_THEME_KEYS) {
    const patterns = COMPILED_THEME_PATTERNS[theme];
    const matched: string[] = [];
    for (let i = 0; i < patterns.length; i += 1) {
      if (patterns[i].test(text)) {
        matched.push(THEME_KEYWORDS[theme][i]);
      }
    }
    if (matched.length > 0) {
      out.push({
        theme,
        label: REFLECTION_THEME_LABEL[theme],
        matchedKeywords: matched,
      });
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Behavioral-context derivation
// -----------------------------------------------------------------------------

const DESTRUCTIVE_EVENT_TYPES = new Set<string>([
  BEHAVIOR_EVENT_TYPES.WARNING_IGNORED,
  BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
  BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
]);

type SessionBehaviorContext = {
  sessionId: string;
  events: BehaviorEvent[];
  monitoring: MonitoringEvent[];
  interventions: InterventionEvent[];
  trades: ClosedTrade[];
};

function sessionContext(
  sessionId: string,
  inputs: AnalyticsSliceInputs,
): SessionBehaviorContext {
  return {
    sessionId,
    events: inputs.behaviorEvents.filter((e) => e.sessionId === sessionId),
    monitoring: inputs.monitoringEvents.filter((e) => e.sessionId === sessionId),
    interventions: inputs.interventions.filter(
      (e) => e.sessionId === sessionId,
    ),
    trades: inputs.closedTrades.filter((t) => t.sessionId === sessionId),
  };
}

function buildLinkedBehavior(
  events: BehaviorEvent[],
  monitoring: MonitoringEvent[],
  interventions: InterventionEvent[],
  trades: ClosedTrade[],
): ReflectionLinkedBehavior {
  let stopWidenings = 0;
  let warningOverrides = 0;
  let rapidReentries = 0;
  let sizeIncreases = 0;
  let mistakesLogged = 0;
  let destructiveEventCount = 0;
  for (const e of events) {
    if (e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER) stopWidenings += 1;
    if (
      e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
      e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED
    ) {
      warningOverrides += 1;
    }
    if (e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION) {
      rapidReentries += 1;
    }
    if (e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED) {
      sizeIncreases += 1;
    }
    if (e.eventType === BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED) {
      mistakesLogged += 1;
    }
    if (DESTRUCTIVE_EVENT_TYPES.has(e.eventType)) destructiveEventCount += 1;
  }
  const escalationsObserved = monitoring.filter(
    (m) => m.severity === "elevated" || m.severity === "critical",
  ).length;
  const cleanTradeCount = trades.filter(
    (t) => t.deviationCount === 0 && t.mistakeCount === 0,
  ).length;
  let cancelCount = 0;
  let reviseCount = 0;
  let continueAnywayCount = 0;
  for (const i of interventions) {
    if (i.decision === "cancel_trade") cancelCount += 1;
    else if (i.decision === "revise_trade") reviseCount += 1;
    else if (i.decision === "continue_anyway") continueAnywayCount += 1;
  }
  return {
    stopWidenings,
    warningOverrides,
    rapidReentries,
    sizeIncreases,
    mistakesLogged,
    escalationsObserved,
    cleanTradeCount,
    destructiveEventCount,
    cancelCount,
    reviseCount,
    continueAnywayCount,
  };
}

function deteriorationOccurred(b: ReflectionLinkedBehavior): boolean {
  return (
    b.destructiveEventCount > 0 ||
    b.escalationsObserved > 0 ||
    b.warningOverrides > 0 ||
    b.stopWidenings > 0
  );
}

function sessionWasClean(b: ReflectionLinkedBehavior): boolean {
  return (
    b.stopWidenings === 0 &&
    b.warningOverrides === 0 &&
    b.rapidReentries === 0 &&
    b.sizeIncreases === 0 &&
    b.mistakesLogged === 0 &&
    b.escalationsObserved === 0
  );
}

function sessionHadRuleBreak(b: ReflectionLinkedBehavior): boolean {
  return b.stopWidenings > 0 || b.warningOverrides > 0;
}

function linkedBehaviorTypes(b: ReflectionLinkedBehavior): string[] {
  const out: string[] = [];
  if (b.stopWidenings > 0) out.push(BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER);
  if (b.warningOverrides > 0) out.push(BEHAVIOR_EVENT_TYPES.WARNING_IGNORED);
  if (b.rapidReentries > 0)
    out.push(BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION);
  if (b.sizeIncreases > 0)
    out.push(BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED);
  if (b.mistakesLogged > 0)
    out.push(BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED);
  return out;
}

// -----------------------------------------------------------------------------
// Alignment derivation — does the reflection language match the behavior?
// -----------------------------------------------------------------------------

function deriveAlignment(
  themes: ReflectionThemeKey[],
  behavior: ReflectionLinkedBehavior,
): { status: ReflectionAlignmentStatus; explanation: string } {
  if (themes.length === 0) {
    return {
      status: "unclear",
      explanation: "No strong theme detected in this reflection.",
    };
  }

  const claimedControl = themes.some((t) => CONTROL_CLAIM_THEMES.has(t));
  const claimedPressure = themes.some((t) => PRESSURE_THEMES.has(t));
  const deteriorated = deteriorationOccurred(behavior);
  const clean = sessionWasClean(behavior);

  // Reflection claims discipline / conviction but observed behavior shows
  // deterioration → contradicted.
  if (claimedControl && deteriorated) {
    return {
      status: "contradicted",
      explanation:
        "Reflection language did not fully match observed behavior — discipline was claimed but deviations occurred.",
    };
  }

  // Reflection self-identifies emotional pressure and behavior shows
  // deterioration → self-awareness matched. Aligned.
  if (claimedPressure && deteriorated) {
    return {
      status: "aligned",
      explanation:
        "Self-reported pressure matched observed behavior — the trader named the state they were in.",
    };
  }

  // Reflection claims discipline / conviction and behavior was clean →
  // aligned.
  if (claimedControl && clean) {
    return {
      status: "aligned",
      explanation:
        "Reflection language aligned with observed behavior — the session held to process.",
    };
  }

  // Reflection self-identifies emotional pressure but behavior was clean
  // → unclear (the trader felt pressure but stayed in process; not a
  // contradiction, not a clean alignment).
  if (claimedPressure && clean) {
    return {
      status: "unclear",
      explanation:
        "Trader reported pressure even though observed behavior stayed within rules.",
    };
  }

  return {
    status: "unclear",
    explanation:
      "Not enough signal to compare reflection language against observed behavior.",
  };
}

// -----------------------------------------------------------------------------
// Confidence
// -----------------------------------------------------------------------------

function confidenceFromOccurrences(n: number): ConfidenceLevel {
  if (n === 0) return "insufficient";
  if (n >= 6) return "high";
  if (n >= 3) return "moderate";
  return "emerging";
}

function sectionConfidence(sourceCount: number): ConfidenceLevel {
  if (sourceCount === 0) return "insufficient";
  if (sourceCount >= 10) return "high";
  if (sourceCount >= 4) return "moderate";
  return "emerging";
}

// -----------------------------------------------------------------------------
// Source collection
// -----------------------------------------------------------------------------

type ReflectionSource = {
  sourceType: ReflectionSourceType;
  sourceId: string;
  sessionId: string | null;
  tradeId: string | null;
  text: string;
  createdAt: string;
  linkedSessionState: string | null;
};

function dailyReflectionSources(r: DailyReflection): ReflectionSource[] {
  const out: ReflectionSource[] = [];
  // Combined answer text — every answer concatenated. Keeps theme
  // extraction simple while still attributing the source to one
  // reflection record.
  const answerText = Object.values(r.answers).join("\n").trim();
  if (answerText) {
    out.push({
      sourceType: "dailyReflection",
      sourceId: r.id,
      sessionId: r.sessionId,
      tradeId: null,
      text: answerText,
      createdAt: r.savedAt,
      linkedSessionState: r.summary?.state ?? null,
    });
  }
  if (r.emotionalNotes.trim()) {
    out.push({
      sourceType: "emotionalNote",
      sourceId: `${r.id}:emotional`,
      sessionId: r.sessionId,
      tradeId: null,
      text: r.emotionalNotes,
      createdAt: r.savedAt,
      linkedSessionState: r.summary?.state ?? null,
    });
  }
  if (r.freeformNotes.trim()) {
    out.push({
      sourceType: "note",
      sourceId: `${r.id}:freeform`,
      sessionId: r.sessionId,
      tradeId: null,
      text: r.freeformNotes,
      createdAt: r.savedAt,
      linkedSessionState: r.summary?.state ?? null,
    });
  }
  return out;
}

function tradeReflectionSource(
  r: TradeReflection,
  trade: ClosedTrade | null,
): ReflectionSource | null {
  const text = Object.values(r.answers).join("\n").trim();
  if (!text) return null;
  return {
    sourceType: "tradeReflection",
    sourceId: r.id,
    sessionId: trade?.sessionId ?? null,
    tradeId: r.tradeId,
    text,
    createdAt: r.savedAt,
    linkedSessionState: null,
  };
}

function noteSource(n: SessionNote): ReflectionSource | null {
  if (!n.content.trim()) return null;
  return {
    sourceType: "note",
    sourceId: n.id,
    sessionId: n.sessionId ?? null,
    tradeId: null,
    text: n.content,
    createdAt: n.createdAt,
    linkedSessionState: null,
  };
}

// -----------------------------------------------------------------------------
// Public input + entry point
// -----------------------------------------------------------------------------

export type ReflectionCorrelationInputs = AnalyticsSliceInputs & {
  traderId: string;
  reflections: DailyReflection[];
  tradeReflections: TradeReflection[];
  sessionNotes: SessionNote[];
};

export function computeReflectionCorrelations(
  inputs: ReflectionCorrelationInputs,
  timeframe: TimeframeDefinition,
  nowMs: number,
): ReflectionCorrelationSummary {
  const windowed = sessionsInWindow(inputs.sessions, timeframe, nowMs);
  const windowedSessionIds = new Set(windowed.map((s) => s.sessionId));

  // -- Source collection inside the window ---------------------------------
  const sources: ReflectionSource[] = [];
  for (const r of inputs.reflections) {
    if (r.sessionId && !windowedSessionIds.has(r.sessionId)) continue;
    sources.push(...dailyReflectionSources(r));
  }
  for (const r of inputs.tradeReflections) {
    const trade =
      inputs.closedTrades.find((t) => t.id === r.tradeId) ?? null;
    if (trade?.sessionId && !windowedSessionIds.has(trade.sessionId)) continue;
    const src = tradeReflectionSource(r, trade);
    if (src) sources.push(src);
  }
  for (const n of inputs.sessionNotes) {
    if (n.sessionId && !windowedSessionIds.has(n.sessionId)) continue;
    const src = noteSource(n);
    if (src) sources.push(src);
  }

  // -- Per-source theme extraction + alignment ----------------------------
  const themeOccurrences: ReflectionThemeOccurrence[] = [];
  const alignments: ReflectionBehaviorAlignment[] = [];
  const behaviorBySession = new Map<string, ReflectionLinkedBehavior>();

  function behaviorForSession(
    sessionId: string,
  ): ReflectionLinkedBehavior {
    const cached = behaviorBySession.get(sessionId);
    if (cached) return cached;
    const ctx = sessionContext(sessionId, inputs);
    const b = buildLinkedBehavior(
      ctx.events,
      ctx.monitoring,
      ctx.interventions,
      ctx.trades,
    );
    behaviorBySession.set(sessionId, b);
    return b;
  }

  function trackedBehaviorForTrade(
    tradeId: string,
  ): ReflectionLinkedBehavior {
    const trade = inputs.closedTrades.find((t) => t.id === tradeId);
    const monitoring = inputs.monitoringEvents.filter(
      (m) => m.tradeId === tradeId,
    );
    const events = trade?.sessionId
      ? inputs.behaviorEvents.filter(
          (e) => e.sessionId === trade.sessionId && e.symbol === trade.symbol,
        )
      : [];
    const interventions = trade?.sessionId
      ? inputs.interventions.filter(
          (i) => i.sessionId === trade.sessionId && i.symbol === trade.symbol,
        )
      : [];
    return buildLinkedBehavior(
      events,
      monitoring,
      interventions,
      trade ? [trade] : [],
    );
  }

  for (const source of sources) {
    const extracted = extractThemes(source.text);
    const themes = extracted.map((e) => e.theme);
    const matchedKeywords = extracted.flatMap((e) => e.matchedKeywords);
    for (const t of extracted) {
      themeOccurrences.push({
        id: `${source.sourceId}:${t.theme}`,
        traderId: inputs.traderId,
        sessionId: source.sessionId,
        tradeId: source.tradeId,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        theme: t.theme,
        matchedKeywords: t.matchedKeywords,
        createdAt: source.createdAt,
      });
    }

    // Resolve linked behavior — prefer trade-scoped when the source is a
    // trade reflection so the alignment compares apples to apples.
    const behavior: ReflectionLinkedBehavior =
      source.tradeId != null
        ? trackedBehaviorForTrade(source.tradeId)
        : source.sessionId
          ? behaviorForSession(source.sessionId)
          : {
              stopWidenings: 0,
              warningOverrides: 0,
              rapidReentries: 0,
              sizeIncreases: 0,
              mistakesLogged: 0,
              escalationsObserved: 0,
              cleanTradeCount: 0,
              destructiveEventCount: 0,
              cancelCount: 0,
              reviseCount: 0,
              continueAnywayCount: 0,
            };
    const { status, explanation } = deriveAlignment(themes, behavior);
    alignments.push({
      id: `${source.sourceId}:alignment`,
      traderId: inputs.traderId,
      sessionId: source.sessionId,
      tradeId: source.tradeId,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      createdAt: source.createdAt,
      themes,
      matchedKeywords,
      linkedBehavior: behavior,
      linkedSessionState: source.linkedSessionState,
      alignmentStatus: status,
      alignmentExplanation: explanation,
    });
  }

  // -- Aggregate theme rollups --------------------------------------------
  const themeCorrelations: ThemeCorrelation[] = [];
  for (const theme of REFLECTION_THEME_KEYS) {
    const occurrencesForTheme = themeOccurrences.filter(
      (o) => o.theme === theme,
    );
    if (occurrencesForTheme.length === 0) continue;
    const sessionIds = new Set<string>();
    const tradeIds = new Set<string>();
    const sourceIds = new Set<string>();
    for (const o of occurrencesForTheme) {
      if (o.sessionId) sessionIds.add(o.sessionId);
      if (o.tradeId) tradeIds.add(o.tradeId);
      sourceIds.add(o.sourceId);
    }

    // Behavior co-occurrence inside the theme's sessions.
    let deteriorated = 0;
    let clean = 0;
    let ruleBreak = 0;
    const linkedBehaviorTypeSet = new Set<string>();
    for (const sessionId of sessionIds) {
      const behavior = behaviorForSession(sessionId);
      if (deteriorationOccurred(behavior)) deteriorated += 1;
      if (sessionWasClean(behavior)) clean += 1;
      if (sessionHadRuleBreak(behavior)) ruleBreak += 1;
      for (const t of linkedBehaviorTypes(behavior)) {
        linkedBehaviorTypeSet.add(t);
      }
    }
    const total = Math.max(1, sessionIds.size);
    const confidence = confidenceFromOccurrences(occurrencesForTheme.length);
    themeCorrelations.push({
      theme,
      label: REFLECTION_THEME_LABEL[theme],
      occurrences: occurrencesForTheme.length,
      sessionsAffected: sessionIds.size,
      tradesAffected: tradeIds.size,
      confidence,
      confidenceLabel: CONFIDENCE_LABEL[confidence],
      deteriorationRate: Math.round((deteriorated / total) * 1000) / 10,
      cleanRate: Math.round((clean / total) * 1000) / 10,
      ruleBreakRate: Math.round((ruleBreak / total) * 1000) / 10,
      linkedBehaviorTypes: Array.from(linkedBehaviorTypeSet),
      supportingSessionIds: Array.from(sessionIds),
      supportingTradeIds: Array.from(tradeIds),
      supportingSourceIds: Array.from(sourceIds),
    });
  }
  themeCorrelations.sort((a, b) => b.occurrences - a.occurrences);

  // -- Card-driving highlights --------------------------------------------
  const mostFrequentTheme = themeCorrelations[0] ?? null;
  const themeMostLinkedToDeterioration =
    [...themeCorrelations]
      .filter(
        (t) =>
          PRESSURE_THEMES.has(t.theme) && t.deteriorationRate > 0,
      )
      .sort(
        (a, b) =>
          b.deteriorationRate - a.deteriorationRate ||
          b.sessionsAffected - a.sessionsAffected,
      )[0] ?? null;
  const themesLinkedToCleanSessions = [...themeCorrelations]
    .filter((t) => t.cleanRate >= 50 && t.sessionsAffected > 0)
    .sort((a, b) => b.cleanRate - a.cleanRate || b.sessionsAffected - a.sessionsAffected)
    .slice(0, 3);
  const themesLinkedToRuleBreaks = [...themeCorrelations]
    .filter((t) => t.ruleBreakRate > 0 && PRESSURE_THEMES.has(t.theme))
    .sort(
      (a, b) =>
        b.ruleBreakRate - a.ruleBreakRate ||
        b.sessionsAffected - a.sessionsAffected,
    )
    .slice(0, 3);

  let alignedCount = 0;
  let contradictedCount = 0;
  let unclearCount = 0;
  for (const a of alignments) {
    if (a.alignmentStatus === "aligned") alignedCount += 1;
    else if (a.alignmentStatus === "contradicted") contradictedCount += 1;
    else unclearCount += 1;
  }

  const conf = sectionConfidence(sources.length);

  return {
    traderId: inputs.traderId,
    timeframeId: timeframe.id,
    timeframeLabel: timeframe.label,
    reflectionSourceCount: sources.length,
    themeOccurrenceCount: themeOccurrences.length,
    themeCorrelations,
    alignments,
    mostFrequentTheme,
    themeMostLinkedToDeterioration,
    themesLinkedToCleanSessions,
    themesLinkedToRuleBreaks,
    alignmentRatio: {
      aligned: alignedCount,
      contradicted: contradictedCount,
      unclear: unclearCount,
    },
    sectionConfidence: conf,
    sectionConfidenceLabel: CONFIDENCE_LABEL[conf],
  };
}
