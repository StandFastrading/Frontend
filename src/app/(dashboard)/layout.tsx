import { Sidebar } from "@/components/layout/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="dark flex flex-1 bg-background text-foreground">
      <Sidebar email={user?.email ?? ""} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
