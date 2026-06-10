"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store";

// Binds the authenticated user's id into the store for the onboarding tree.
//
// Onboarding lives outside the dashboard layout, so it never mounts
// <StoreHydrator>. Without the userId, every onboarding write hits the
// `if (!userId) return` guard in the slice sync helpers and is dropped before
// it reaches Supabase. This sets the id so onboarding writes enqueue and sync
// live, exactly like the rest of the app. It intentionally does NOT hydrate or
// run the local→server migration — a new user's server rows are still defaults,
// and the dashboard's StoreHydrator owns that one-shot.
export function OnboardingStoreBinder({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    useAppStore.getState()._setUserId(userId);
  }, [userId]);
  return <>{children}</>;
}
