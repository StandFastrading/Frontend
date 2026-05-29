import {
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
} from "@/lib/analytics/timeframe";

// =============================================================================
// Evidence Weighting & False-Positive Reduction Layer
// =============================================================================
//
// PURPOSE
//   Centralize how the analytics layer classifies behavioral signals so
//   no surface (cluster cards, reflection correlations, intervention
//   outcomes, insights feed) presents loose associations as confirmed
//   behavior. Every surface should answer the same question the same
//   way: "did the underlying event actually fire, and how strongly?"
//
// THE HIERARCHY (strongest → weakest)
//
//   1. DIRECTLY OBSERVED   — the named event was recorded in this
//                            window. Surface freely.
//   2. STRONGLY CORRELATED — a relationship between two recorded
//                            events recurred across multiple sessions.
//                            Surface as "Correlated" — not "Observed".
//   3. LOOSELY ASSOCIATED  — conceptually related but not directly
//                            recorded. Only render under an explicit
//                            "Possible association" header.
//   4. NOT OBSERVED        — no recorded support. Engines should
//                            generally omit rather than display "0".
//
// DESIGN PRINCIPLES
//   * Deterministic — no AI, no probabilistic scoring.
//   * Single classifier — surfaces never re-derive their own buckets.
//   * AI-ready output — every classified record carries traceable
//     supporting ids so a future retrieval layer can answer queries like
//     "only show me directly observed behaviors with sessionsAffected >= 3".
// =============================================================================

export const EVIDENCE_LEVELS = [
  "directly_observed",
  "strongly_correlated",
  "loosely_associated",
  "not_observed",
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABEL: Record<EvidenceLevel, string> = {
  directly_observed: "Observed",
  strongly_correlated: "Correlated",
  loosely_associated: "Possible",
  not_observed: "Not observed",
};

export const EVIDENCE_LEVEL_DESCRIPTION: Record<EvidenceLevel, string> = {
  directly_observed:
    "Recorded as an actual event inside the active timeframe.",
  strongly_correlated:
    "Repeated relationship between recorded events across multiple sessions.",
  loosely_associated:
    "Conceptually related but no direct event recorded.",
  not_observed: "No supporting record in the active timeframe.",
};

// Ordering helper — surfaces that want to sort evidence rows highest-
// strength-first should compare on this rank.
export const EVIDENCE_LEVEL_RANK: Record<EvidenceLevel, number> = {
  directly_observed: 3,
  strongly_correlated: 2,
  loosely_associated: 1,
  not_observed: 0,
};

// Raw observation snapshot — the minimum the classifier needs.
export type EvidenceObservation = {
  // Raw count of the underlying event inside the window.
  observedCount: number;
  // Distinct session count across observations.
  sessionsAffected: number;
  // Supporting record ids. Every entry must originate from a record
  // already in the store so the future AI retrieval layer can hop
  // straight to the source.
  supportingEventIds: string[];
  supportingSessionIds: string[];
  supportingTradeIds: string[];
  // ISO of the most recent qualifying observation; null when nothing.
  lastObservedAt: string | null;
};

// Output shape — every classifier consumer (cluster engine, reflection
// engine, insights feed, future surfaces) emits this.
export type EvidenceClassifiedBehavior = EvidenceObservation & {
  behaviorType: string;
  label: string;
  evidenceLevel: EvidenceLevel;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  explanation: string;
};

// Classifier input. `relationshipObservation` flags cross-event
// relationships (the cluster's common chain, a reflection→behavior
// pair) — those promote from `directly_observed` to `strongly_correlated`
// once enough sessions recurrence is present. `correlationHint`
// elevates a zero-observation case into `loosely_associated` instead of
// `not_observed` — used sparingly, only when the caller has a documented
// conceptual link they want to acknowledge but not assert.
export type ClassifyInput = {
  behaviorType: string;
  label: string;
  observation: EvidenceObservation;
  relationshipObservation?: boolean;
  correlationHint?: boolean;
  // Optional override of the auto-derived explanation. Use when the
  // caller has more semantic context than the generic copy can express.
  explanation?: string;
};

export function classifyEvidence(
  input: ClassifyInput,
): EvidenceClassifiedBehavior {
  const {
    behaviorType,
    label,
    observation,
    relationshipObservation,
    correlationHint,
    explanation,
  } = input;
  const { observedCount, sessionsAffected } = observation;

  let evidenceLevel: EvidenceLevel;
  let confidence: ConfidenceLevel;

  if (observedCount <= 0) {
    if (correlationHint) {
      evidenceLevel = "loosely_associated";
      confidence = "emerging";
    } else {
      evidenceLevel = "not_observed";
      confidence = "insufficient";
    }
  } else if (relationshipObservation) {
    // Cross-event relationship. Promote to strongly_correlated only when
    // the relationship recurred across enough sessions.
    if (sessionsAffected >= 5) {
      evidenceLevel = "strongly_correlated";
      confidence = "high";
    } else if (sessionsAffected >= 3) {
      evidenceLevel = "strongly_correlated";
      confidence = "moderate";
    } else {
      evidenceLevel = "directly_observed";
      confidence = "emerging";
    }
  } else {
    evidenceLevel = "directly_observed";
    if (sessionsAffected >= 5) confidence = "high";
    else if (sessionsAffected >= 3) confidence = "moderate";
    else if (sessionsAffected >= 1) confidence = "emerging";
    else confidence = "insufficient";
  }

  const generatedExplanation = (() => {
    switch (evidenceLevel) {
      case "directly_observed":
        return `${label} recorded ${observedCount} time${observedCount === 1 ? "" : "s"} across ${sessionsAffected} session${sessionsAffected === 1 ? "" : "s"}.`;
      case "strongly_correlated":
        return `${label} co-occurred across ${sessionsAffected} sessions.`;
      case "loosely_associated":
        return `${label} is conceptually related but no direct event recorded.`;
      case "not_observed":
        return `${label} was not recorded in this window.`;
    }
  })();

  return {
    behaviorType,
    label,
    evidenceLevel,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    explanation: explanation ?? generatedExplanation,
    ...observation,
  };
}

// Convenience constructors for callers that build observation snapshots
// from a behavior event log filtered by event type.
export function emptyObservation(): EvidenceObservation {
  return {
    observedCount: 0,
    sessionsAffected: 0,
    supportingEventIds: [],
    supportingSessionIds: [],
    supportingTradeIds: [],
    lastObservedAt: null,
  };
}

export function notObserved(input: {
  behaviorType: string;
  label: string;
}): EvidenceClassifiedBehavior {
  return classifyEvidence({
    behaviorType: input.behaviorType,
    label: input.label,
    observation: emptyObservation(),
  });
}

// Bucket helper — splits a heterogeneous list of evidence rows into the
// three rendering buckets surfaces use. `not_observed` records are
// intentionally dropped because the UI rule is "don't show what didn't
// happen", but the caller still has them if they want to enumerate
// explicitly checked-and-absent behaviors.
export type EvidenceBreakdown = {
  primary: EvidenceClassifiedBehavior[]; // directly_observed
  correlated: EvidenceClassifiedBehavior[]; // strongly_correlated
  possible: EvidenceClassifiedBehavior[]; // loosely_associated
};

export function bucketEvidence(
  rows: EvidenceClassifiedBehavior[],
): EvidenceBreakdown {
  const out: EvidenceBreakdown = {
    primary: [],
    correlated: [],
    possible: [],
  };
  for (const row of rows) {
    if (row.evidenceLevel === "directly_observed") out.primary.push(row);
    else if (row.evidenceLevel === "strongly_correlated")
      out.correlated.push(row);
    else if (row.evidenceLevel === "loosely_associated")
      out.possible.push(row);
    // not_observed is dropped — surfaces should omit rather than render.
  }
  // Within each bucket, sort by sessionsAffected desc then observedCount
  // desc so the strongest evidence reads first.
  const sortRows = (xs: EvidenceClassifiedBehavior[]) =>
    xs.sort((a, b) => {
      const sDelta = b.sessionsAffected - a.sessionsAffected;
      if (sDelta !== 0) return sDelta;
      return b.observedCount - a.observedCount;
    });
  sortRows(out.primary);
  sortRows(out.correlated);
  sortRows(out.possible);
  return out;
}
