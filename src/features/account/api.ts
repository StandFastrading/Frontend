import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileInput } from "./schemas";

export async function updateProfile(input: ProfileInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({
    data: input,
  });
  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}
