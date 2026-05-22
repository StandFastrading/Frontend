import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { ProfileForm } from "@/features/account/components/profile-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";

  return (
    <Card>
      <CardContent className="pt-6">
        <ProfileForm
          email={user.email ?? ""}
          defaultValues={{ display_name: displayName }}
        />
      </CardContent>
    </Card>
  );
}
