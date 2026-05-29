import { TradeHistoryPage } from "@/features/trades/components/trade-history-page";

// Trade History route — the platform's closed-trade table. Engine,
// derivation, filtering, sorting, and the summary row all live in
// `trade-history-engine.ts`; this route just mounts the page.

export default function TradesPage() {
  return <TradeHistoryPage />;
}
