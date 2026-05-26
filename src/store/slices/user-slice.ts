import type { UserProfile, UserProfilePatch } from "@/types";
import { getDefaultUserProfile } from "@/types";
import type { SliceCreator } from "@/store/types";

export type UserSlice = {
  user: UserProfile;
  setUserProfile: (next: UserProfile) => void;
  patchUserProfile: (patch: UserProfilePatch) => void;
  resetUserProfile: () => void;
};

export const createUserSlice: SliceCreator<UserSlice> = (set) => ({
  user: getDefaultUserProfile(),
  setUserProfile: (next) =>
    set(() => ({
      user: { ...next, updatedAt: new Date().toISOString() },
    })),
  patchUserProfile: (patch) =>
    set((state) => ({
      user: {
        ...state.user,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),
  resetUserProfile: () => set(() => ({ user: getDefaultUserProfile() })),
});
