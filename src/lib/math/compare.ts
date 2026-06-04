// Epsilon-tolerant numeric comparisons for threshold rules.
//
// Why this exists: validation thresholds in StandFast often compare a
// computed value (reward:risk ratio, account-risk %, daily-loss %)
// against a configured minimum or maximum. The computed side is
// derived from float arithmetic on price differences, so IEEE 754
// representation noise can make a display-equal value (e.g. "2.00 : 1")
// fall a fraction below the threshold and trip a warning the trader
// can't see is coming. Concrete case: with entry 4.19, stop 3.80,
// target 4.97, the unrounded reward:risk is 1.9999999999999822 in
// float64 — `>= 2` returns false even though the trader entered
// numbers that read as exactly 2.00 : 1.
//
// Anywhere a future rule compares a ratio or percentage to a
// configured threshold, prefer these helpers over raw `>=` / `<=` so
// the tolerance is the same on every surface (label, status, message,
// recommendedAction) — and so a behavior change to the tolerance
// only needs to happen in one place.

// Epsilon for ratio / percentage comparisons. Chosen well above IEEE
// 754 noise (~1e-15 for typical price arithmetic) and well below the
// precision a trader would notice on a 2-decimal display. Same value
// used by every helper so all rules agree on the same boundary.
export const COMPARE_EPSILON = 1e-9;

// "value is at least `threshold`" — equality tolerated within
// COMPARE_EPSILON. Use for pass branches that should accept exact
// equality (e.g. reward:risk that meets the configured minimum).
export function atLeast(value: number, threshold: number): boolean {
  return value >= threshold - COMPARE_EPSILON;
}

// "value is at most `threshold`" — symmetric upper-bound helper.
export function atMost(value: number, threshold: number): boolean {
  return value <= threshold + COMPARE_EPSILON;
}

// "value is strictly below `threshold`" — false when within epsilon
// of equality. Use for warning/fail branches that should NOT fire at
// exact equality. Logically `!atLeast(value, threshold)`; spelled out
// here so call sites read naturally without a leading negation.
export function below(value: number, threshold: number): boolean {
  return !atLeast(value, threshold);
}

// "value is strictly above `threshold`" — symmetric to `below`.
export function above(value: number, threshold: number): boolean {
  return !atMost(value, threshold);
}

// "values are equal within epsilon" — useful for cross-comparing two
// computed ratios (e.g. checking whether a partial-exit price matches
// the original target).
export function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= COMPARE_EPSILON;
}
