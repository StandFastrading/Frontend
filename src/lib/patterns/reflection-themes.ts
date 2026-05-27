import type { DailyReflection, SessionNote } from "@/types";

// =============================================================================
// Reflection theme extraction
// =============================================================================
//
// First-generation, deterministic theme extractor. NO AI — keyword matching
// only. Designed as the scaffolding the future AI mentor will replace; the
// PUBLIC SHAPE is what matters here so downstream code (pattern engine,
// future AI summarization layer) keeps working when the implementation
// upgrades.
//
// Themes are small, behaviorally meaningful emotional labels. Each theme
// carries a keyword list (case-insensitive, word-boundary matched). A
// reflection or note "carries" a theme if any of the theme's keywords appear
// in any of its text fields. Multiple themes can attach to the same record.
//
// To keep the keyword tables maintainable, every theme also records:
//   * `severity` — a coarse behavioral weight (how concerning is this
//                  theme when it appears?). Used by the pattern engine to
//                  prioritize.
//   * `label`    — human-readable display string.
//
// Future work: replace keyword matching with an embedding-based classifier
// or LLM call. The output shape (ReflectionTheme[]) does not change.
// =============================================================================

export const REFLECTION_THEME_IDS = [
  "urgency",
  "revenge",
  "hesitation",
  "fear",
  "impatience",
  "boredom",
  "fomo",
  "frustration",
] as const;
export type ReflectionThemeId = (typeof REFLECTION_THEME_IDS)[number];

export type ReflectionThemeSeverity = "neutral" | "caution" | "warning";

type ThemeDefinition = {
  id: ReflectionThemeId;
  label: string;
  severity: ReflectionThemeSeverity;
  // Lowercased phrases. Matched against word boundaries (whole-phrase) so
  // "boredom" hits but "borderline" does NOT, and "fear" hits but "feared"
  // also hits because the matcher checks startsWith-of-word too. The
  // matcher is intentionally simple — accuracy is best-effort, the API is
  // what AI will plug into later.
  keywords: string[];
};

const THEMES: Record<ReflectionThemeId, ThemeDefinition> = {
  urgency: {
    id: "urgency",
    label: "Urgency",
    severity: "caution",
    keywords: [
      "urgent",
      "urgency",
      "rushed",
      "rushing",
      "rush",
      "hurry",
      "hurried",
      "had to get in",
      "pressure",
      "couldn't wait",
      "felt like i had to",
    ],
  },
  revenge: {
    id: "revenge",
    label: "Revenge",
    severity: "warning",
    keywords: [
      "revenge",
      "get back",
      "make it back",
      "make up the loss",
      "make up for",
      "recover the loss",
      "lost ground",
      "win it back",
      "claw back",
      "get even",
    ],
  },
  hesitation: {
    id: "hesitation",
    label: "Hesitation",
    severity: "caution",
    keywords: [
      "hesitated",
      "hesitation",
      "hesitant",
      "second-guessed",
      "second guessed",
      "doubted",
      "froze",
      "missed it",
      "delayed",
      "waited too long",
    ],
  },
  fear: {
    id: "fear",
    label: "Fear",
    severity: "caution",
    keywords: [
      "fear",
      "feared",
      "fearful",
      "afraid",
      "scared",
      "anxious",
      "anxiety",
      "nervous",
      "panicked",
      "panic",
    ],
  },
  impatience: {
    id: "impatience",
    label: "Impatience",
    severity: "caution",
    keywords: [
      "impatient",
      "impatience",
      "couldn't sit",
      "didn't wait",
      "jumped in",
      "wanted to be in",
      "wanted in",
      "had to be in",
      "needed to trade",
    ],
  },
  boredom: {
    id: "boredom",
    label: "Boredom",
    severity: "caution",
    keywords: [
      "bored",
      "boredom",
      "nothing happening",
      "nothing was happening",
      "quiet day",
      "slow day",
      "killing time",
    ],
  },
  fomo: {
    id: "fomo",
    label: "FOMO",
    severity: "warning",
    keywords: [
      "fomo",
      "missing out",
      "missed out",
      "left out",
      "everyone was",
      "chasing",
      "chased",
    ],
  },
  frustration: {
    id: "frustration",
    label: "Frustration",
    severity: "caution",
    keywords: [
      "frustrated",
      "frustration",
      "frustrating",
      "annoyed",
      "irritated",
      "tired of",
      "fed up",
      "sick of",
    ],
  },
};

export function themeLabel(id: ReflectionThemeId): string {
  return THEMES[id].label;
}

export function themeSeverity(id: ReflectionThemeId): ReflectionThemeSeverity {
  return THEMES[id].severity;
}

// -----------------------------------------------------------------------------
// Matching
// -----------------------------------------------------------------------------

// Lowercases + collapses runs of whitespace so the keyword matcher works
// against a stable canonical form. Removing punctuation noise but not
// dropping word breaks — the matcher relies on boundaries.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
}

// True if `phrase` (lowercased) appears as a discrete fragment in `haystack`.
// "fear" matches "I felt fear" but NOT "fearless"; multi-word phrases like
// "get back" are matched as substrings since they already contain word
// boundaries.
function containsPhrase(haystack: string, phrase: string): boolean {
  if (phrase.includes(" ")) {
    return haystack.includes(phrase);
  }
  // Single word — check word boundaries on either side.
  const idx = haystack.indexOf(phrase);
  if (idx < 0) return false;
  const before = idx === 0 ? " " : haystack[idx - 1];
  const after =
    idx + phrase.length >= haystack.length
      ? " "
      : haystack[idx + phrase.length];
  const boundary = /[\s.,!?'"]/;
  return boundary.test(before) && boundary.test(after);
}

// Returns the set of themes that appear in `text`. Empty Set if no theme.
export function themesInText(text: string): Set<ReflectionThemeId> {
  const out = new Set<ReflectionThemeId>();
  if (!text) return out;
  const normalized = normalize(text);
  if (!normalized) return out;
  for (const id of REFLECTION_THEME_IDS) {
    const def = THEMES[id];
    for (const k of def.keywords) {
      if (containsPhrase(normalized, k)) {
        out.add(id);
        break;
      }
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Per-record extraction
// -----------------------------------------------------------------------------

function reflectionTextFields(r: DailyReflection): string {
  // Concatenate every free-text surface — the matcher is robust to a
  // single big blob and the engine doesn't currently care WHICH field
  // a theme came from.
  const parts: string[] = [r.emotionalNotes, r.freeformNotes];
  for (const v of Object.values(r.answers)) {
    if (typeof v === "string") parts.push(v);
  }
  return parts.join(" ");
}

export function themesForReflection(
  r: DailyReflection,
): Set<ReflectionThemeId> {
  return themesInText(reflectionTextFields(r));
}

export function themesForNote(n: SessionNote): Set<ReflectionThemeId> {
  return themesInText(n.content);
}
