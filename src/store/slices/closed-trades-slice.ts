import { enqueueSync, tradeMapper } from "@/lib/sync";
import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import { getCurrentTradingDate, type ClosedTrade } from "@/types";
import type { SliceCreator } from "@/store/types";

// Append-only archive of completed trades. Populated by the `logExit` thunk
// on the active-trades slice when a position closes. The future Trade
// History page will read directly from here; Reports + Behavior Analytics
// aggregate across the full archive.
//
// Server sync: every append UPSERTs into the `trades` table. Because each
// trade started life as an active row (created at "Mark Trade as Active"),
// the upsert collapses the activate→close transition onto the same row by
// overwriting status='closed' + exit fields. (user_id, client_id) is the
// conflict key so the upsert hits the same row.

export type ClosedTradesSlice = {
  closedTrades: ClosedTrade[];
  appendClosedTrade: (trade: ClosedTrade) => void;
  removeClosedTrade: (id: string) => void;
  clearClosedTrades: () => void;
};

export const createClosedTradesSlice: SliceCreator<ClosedTradesSlice> = (
  set,
  get,
) => ({
  closedTrades: [],
  appendClosedTrade: (trade) => {
    const stamped = stampWithActiveSession(get(), trade);
    set((state) => ({
      closedTrades: [stamped, ...state.closedTrades],
    }));
    const userId = get().userId;
    if (userId) {
      enqueueSync({
        table: "trades",
        op: "upsert",
        payload: tradeMapper.closedTradeToInsert(
          stamped,
          userId,
          stamped.tradingDate ?? getCurrentTradingDate(),
        ),
        onConflict: "user_id,client_id",
      });
    }
  },
  removeClosedTrade: (id) =>
    set((state) => ({
      closedTrades: state.closedTrades.filter((t) => t.id !== id),
    })),
  clearClosedTrades: () => set(() => ({ closedTrades: [] })),
});
