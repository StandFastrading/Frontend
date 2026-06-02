import type { ClosedTrade } from "@/types";

// Account balance helpers. StandFast keeps the trader's configured account
// size — the "Starting Balance" — as the fixed session baseline that
// `riskRules.accountSize` represents. The live "Current Balance" the
// trader actually has to trade against is derived: starting balance plus
// the realized P/L from trades closed today.
//
// Why derived, not stored: the closed-trades archive already carries the
// authoritative numbers. Persisting a separate `currentBalance` would
// create a denormalized field that could drift from the archive on any
// edit (or on a bug in a future write path). Recomputing on read is
// cheap and impossible to desync.
//
// Daily loss tracking (the `dailyLossUsedPercent` cap in active-trades-
// slice) intentionally still anchors to the Starting Balance — a session
// risk limit needs a stable denominator so cap math doesn't slide as
// realized P/L moves. Next-trade risk %, by contrast, should reflect the
// money actually at hand, so it uses Current Balance.

function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Sum of realized P/L for trades closed today. Same semantic as the
// dashboard's `pnLToday` so all three surfaces stay in agreement.
export function deriveRealizedPnLToday(closedTrades: ClosedTrade[]): number {
  return closedTrades
    .filter((t) => isToday(t.closedAt))
    .reduce((sum, t) => sum + t.realizedPnL, 0);
}

// Starting Balance + Realized P/L Today. Used as the divisor for
// next-trade risk-percentage calculations everywhere the trader is
// reasoning about what they can risk on the NEXT trade given today's
// realized result.
export function deriveCurrentAccountBalance(
  startingBalance: number,
  closedTrades: ClosedTrade[],
): number {
  return startingBalance + deriveRealizedPnLToday(closedTrades);
}
