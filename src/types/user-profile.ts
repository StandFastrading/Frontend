import { z } from "zod";

import { MARKET_TYPES, type MarketType } from "@/types/risk";

// Canonical, app-wide trader profile. Edited via onboarding + account flows,
// consumed across the platform.

export const USER_PLANS = ["trial", "starter", "pro", "elite"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

export const userProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string().email().or(z.literal("")),
  plan: z.enum(USER_PLANS),
  onboardingComplete: z.boolean(),
  // Markets the trader opted into during onboarding. Drives Trade Desk
  // market-type defaulting + future per-market gating.
  selectedMarkets: z.array(z.enum(MARKET_TYPES)),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export type UserProfilePatch = Partial<
  Omit<UserProfile, "userId" | "createdAt">
> & {
  selectedMarkets?: MarketType[];
};

function generateLocalUserId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getDefaultUserProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    userId: generateLocalUserId(),
    displayName: "",
    email: "",
    plan: "trial",
    onboardingComplete: false,
    selectedMarkets: ["Stocks"],
    createdAt: now,
    updatedAt: now,
  };
}
