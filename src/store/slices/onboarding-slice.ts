import type { SliceCreator } from "@/store/types";

// Onboarding-completion + current-step tracking. The `onboardingComplete`
// flag here mirrors `user.onboardingComplete` so callers that only need the
// flag don't have to depend on the user slice — when one changes, the other
// follows via `completeOnboarding()`.

export type OnboardingSlice = {
  onboarding: {
    complete: boolean;
    currentStep: number;
    completedAt: string | null;
  };
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

export const createOnboardingSlice: SliceCreator<OnboardingSlice> = (set) => ({
  onboarding: {
    complete: false,
    currentStep: 0,
    completedAt: null,
  },
  setOnboardingStep: (step) =>
    set((state) => ({
      onboarding: { ...state.onboarding, currentStep: step },
    })),
  completeOnboarding: () =>
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        complete: true,
        completedAt: new Date().toISOString(),
      },
      user: { ...state.user, onboardingComplete: true },
    })),
  resetOnboarding: () =>
    set(() => ({
      onboarding: { complete: false, currentStep: 0, completedAt: null },
    })),
});
