import type { SessionMetrics } from "@/types";
import { getDefaultSessionMetrics } from "@/types";
import type { SliceCreator } from "@/store/types";

// Session metrics are the live counters the validation engine consults.
// Today they're set manually for demo purposes; future broker integration
// will increment them as trades execute.

export type SessionSlice = {
  session: SessionMetrics;
  setSessionMetrics: (next: SessionMetrics) => void;
  patchSessionMetrics: (patch: Partial<SessionMetrics>) => void;
  resetSessionMetrics: () => void;
};

export const createSessionSlice: SliceCreator<SessionSlice> = (set) => ({
  // Counters start at zero. A new TradingSession resets them via
  // `startNewSession` on the sessions slice; the validation engine + the
  // dashboard read live values straight from here.
  session: getDefaultSessionMetrics(),
  setSessionMetrics: (next) => set(() => ({ session: next })),
  patchSessionMetrics: (patch) =>
    set((state) => ({ session: { ...state.session, ...patch } })),
  resetSessionMetrics: () =>
    set(() => ({ session: getDefaultSessionMetrics() })),
});
