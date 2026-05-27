import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { ClosedTrade } from "@/types";
import type { SliceCreator } from "@/store/types";

// Append-only archive of completed trades. Populated by the `logExit` thunk
// on the active-trades slice when a position closes. The future Trade
// History page will read directly from here; Reports + Behavior Analytics
// aggregate across the full archive.

export type ClosedTradesSlice = {
  closedTrades: ClosedTrade[];
  appendClosedTrade: (trade: ClosedTrade) => void;
  removeClosedTrade: (id: string) => void;
  clearClosedTrades: () => void;
};

export const createClosedTradesSlice: SliceCreator<ClosedTradesSlice> = (
  set,
) => ({
  closedTrades: [],
  appendClosedTrade: (trade) =>
    set((state) => ({
      closedTrades: [
        stampWithActiveSession(state, trade),
        ...state.closedTrades,
      ],
    })),
  removeClosedTrade: (id) =>
    set((state) => ({
      closedTrades: state.closedTrades.filter((t) => t.id !== id),
    })),
  clearClosedTrades: () => set(() => ({ closedTrades: [] })),
});
