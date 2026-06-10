import { enqueueSync, profileMapper } from "@/lib/sync";
import type { UserProfile, UserProfilePatch } from "@/types";
import { getDefaultUserProfile } from "@/types";
import type { SliceCreator } from "@/store/types";

// User profile slice — the trader's display name, email, plan, and
// onboarding state. Server sync: every mutation upserts the `profiles` row
// keyed by user_id. The row is created from signup-time via the
// handle_new_user() auth trigger.

export type UserSlice = {
  user: UserProfile;
  setUserProfile: (next: UserProfile) => void;
  patchUserProfile: (patch: UserProfilePatch) => void;
  resetUserProfile: () => void;
};

function syncUserProfile(profile: UserProfile, userId: string | null) {
  if (!userId) return;
  enqueueSync({
    table: "profiles",
    op: "upsert",
    payload: profileMapper.toUpsert(profile, userId),
    onConflict: "id",
  });
}

export const createUserSlice: SliceCreator<UserSlice> = (set, get) => ({
  user: getDefaultUserProfile(),
  setUserProfile: (next) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    set(() => ({ user: stamped }));
    syncUserProfile(stamped, get().userId);
  },
  patchUserProfile: (patch) => {
    const prev = get().user;
    const stamped = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    set(() => ({ user: stamped }));
    syncUserProfile(stamped, get().userId);
  },
  resetUserProfile: () => set(() => ({ user: getDefaultUserProfile() })),
});
