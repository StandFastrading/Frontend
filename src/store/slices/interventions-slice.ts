import { enqueueSync, interventionMapper } from "@/lib/sync";
import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { InterventionEvent } from "@/types";
import type { SliceCreator } from "@/store/types";

// Focused stream of intervention outcomes (modal Continue/Revise/Cancel).
// Narrower than the full behavior event log; lets Behavior Analytics score
// override rates without re-filtering every event.
//
// Server sync: every append also inserts into `interventions` (append-only,
// no UPDATE/DELETE policy). Retries are safe via (user_id, client_id).

export type InterventionsSlice = {
  interventions: InterventionEvent[];
  appendIntervention: (event: InterventionEvent) => void;
  clearInterventions: () => void;
};

export const createInterventionsSlice: SliceCreator<InterventionsSlice> = (
  set,
  get,
) => ({
  interventions: [],
  appendIntervention: (event) => {
    let stamped: InterventionEvent | null = null;
    set((state) => {
      stamped = stampWithActiveSession(state, event);
      return {
        interventions: [stamped, ...state.interventions],
      };
    });
    const userId = get().userId;
    if (userId && stamped) {
      enqueueSync({
        table: "interventions",
        op: "insert",
        payload: interventionMapper.toInsert(stamped, userId),
      });
    }
  },
  clearInterventions: () => set(() => ({ interventions: [] })),
});
