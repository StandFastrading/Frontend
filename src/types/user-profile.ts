import { z } from "zod";

import { MARKET_TYPES, type MarketType } from "@/types/risk";

// Canonical, app-wide trader profile. Edited via onboarding + account flows,
// consumed across the platform.

export const USER_PLANS = ["trial", "starter", "pro", "elite"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

// Behavioral baseline captured in the onboarding "Behavioral check-in".
// Every field has a default so a `{}` JSONB (existing rows / first write)
// parses cleanly.
export const behavioralBaselineSchema = z.object({
  // Base (stocks) flow: self-described mindset + risk tolerance + triggers.
  mindset: z.string().nullable().default(null),
  riskTolerance: z.string().nullable().default(null),
  triggers: z.array(z.string()).default([]),
  customTriggers: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .default([]),
  // Per-market flows (futures/forex/options/crypto): self-identified problem
  // behaviors + free-text notes (no mindset/riskTolerance prompt there).
  behaviors: z.array(z.string()).default([]),
  customBehaviors: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .default([]),
  notes: z.string().default(""),
});
export type BehavioralBaseline = z.infer<typeof behavioralBaselineSchema>;

export function getDefaultBehavioralBaseline(): BehavioralBaseline {
  return {
    mindset: null,
    riskTolerance: null,
    triggers: [],
    customTriggers: [],
    behaviors: [],
    customBehaviors: [],
    notes: "",
  };
}

// Tolerant parse for the JSONB column — falls back to the default rather than
// throwing on malformed/empty data.
export function parseBehavioralBaseline(raw: unknown): BehavioralBaseline {
  const result = behavioralBaselineSchema.safeParse(raw ?? {});
  return result.success ? result.data : getDefaultBehavioralBaseline();
}

export const userProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string().email().or(z.literal("")),
  plan: z.enum(USER_PLANS),
  onboardingComplete: z.boolean(),
  // Markets the trader opted into during onboarding. Drives Trade Desk
  // market-type defaulting + future per-market gating.
  selectedMarkets: z.array(z.enum(MARKET_TYPES)),
  behavioralBaseline: behavioralBaselineSchema.default(() =>
    getDefaultBehavioralBaseline(),
  ),
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
    behavioralBaseline: getDefaultBehavioralBaseline(),
    createdAt: now,
    updatedAt: now,
  };
}
