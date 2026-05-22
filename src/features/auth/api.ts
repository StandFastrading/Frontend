import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LoginInput, SignupInput } from "./schemas";

export async function signInWithPassword(input: LoginInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(input: SignupInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp(input);
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
