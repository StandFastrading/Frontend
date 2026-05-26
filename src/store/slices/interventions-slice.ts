import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { InterventionEvent } from "@/types";
import type { SliceCreator } from "@/store/types";

// Focused stream of intervention outcomes (modal Continue/Revise/Cancel).
// Narrower than the full behavior event log; lets Behavior Analytics score
// override rates without re-filtering every event.

export type InterventionsSlice = {
  interventions: InterventionEvent[];
  appendIntervention: (event: InterventionEvent) => void;
  clearInterventions: () => void;
};

export const createInterventionsSlice: SliceCreator<InterventionsSlice> = (
  set,
) => ({
  interventions: [],
  appendIntervention: (event) =>
    set((state) => ({
      interventions: [
        stampWithActiveSession(state, event),
        ...state.interventions,
      ],
    })),
  clearInterventions: () => set(() => ({ interventions: [] })),
});
