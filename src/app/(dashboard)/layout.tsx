import { Sidebar } from "@/components/layout/sidebar";
import { StoreHydrator } from "@/components/store-hydrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emptySeedPayload,
  fetchServerSeed,
  type ServerSeedPayload,
} from "@/lib/sync/hydrate";

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

  let seed: ServerSeedPayload = emptySeedPayload;
  if (user) {
    try {
      seed = await fetchServerSeed(user.id);
    } catch (err) {
      // Don't block the dashboard if the seed fetch fails — fall back to
      // whatever the client cache has and let the user retry. The sync
      // queue's online-event listener will reconcile once the network
      // recovers. Log loudly so the failure shows up in server logs.
      console.error("[hydrate] failed to fetch server seed", err);
    }
  }

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
      <StoreHydrator userId={user?.id ?? null} seed={seed}>
        <div className="relative z-10 flex flex-1">
          <Sidebar email={user?.email ?? ""} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </StoreHydrator>
    </div>
  );
}
