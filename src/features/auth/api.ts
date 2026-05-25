import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LoginInput } from "./schemas";

export async function signInWithPassword(input: LoginInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  fullName?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: input.fullName
      ? { data: { full_name: input.fullName } }
      : undefined,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
