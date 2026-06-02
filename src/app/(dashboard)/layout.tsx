import { Sidebar } from "@/components/layout/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Skip prerender — this layout reads cookies and Supabase env vars at request time.
export const dynamic = "force-dynamic";

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
    <div className="dark relative flex flex-1 overflow-hidden bg-background text-foreground">
      {/* Ambient depth layer — mirrors the onboarding shell so the
          working surface shares its product family without competing
          with content. Tuned softer than onboarding: tighter blurs,
          edge-anchored placements, and a center vignette that keeps
          cards crisp in the workspace area. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 size-[560px] rounded-full bg-cyan-500/[0.07] blur-[160px]" />
        <div className="absolute -bottom-48 -right-40 size-[520px] rounded-full bg-blue-600/[0.06] blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 size-[360px] rounded-full bg-emerald-500/[0.025] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />
      </div>
      <div className="relative z-10 flex flex-1">
        <Sidebar email={user?.email ?? ""} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
