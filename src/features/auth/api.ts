import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getEnv } from "@/config/env";
import type { BetaEntryInput, LoginInput } from "./schemas";

export async function signInWithPassword(input: LoginInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export type BetaPhase = "phase_1" | "phase_2";

export type BetaEntryResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  beta_phase: BetaPhase;
  is_new: boolean;
};

// Beta entry: validate email + access code against the approved tester list on
// the backend (where the service-role key lives), receive a minted Supabase
// session, and set it client-side. No password, no signup, no confirmation.
export async function betaEntry(input: BetaEntryInput): Promise<BetaEntryResult> {
  const res = await fetch(
    `${getEnv().NEXT_PUBLIC_API_BASE_URL}/api/v1/beta/entry`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim(),
        access_code: input.accessCode.trim(),
      }),
    },
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body?.error?.message ?? body?.detail ?? "Could not verify your beta access";
    throw new Error(message);
  }

  const result = body as BetaEntryResult;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw error;
  return result;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
