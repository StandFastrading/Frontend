import { ChartBackdrop } from "@/features/onboarding/components/chart-backdrop";
import { OnboardingStoreBinder } from "@/components/onboarding-store-binder";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reads cookies/Supabase at request time to bind the user id — can't prerender.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="dark relative flex flex-1 flex-col overflow-hidden bg-[#040711] text-foreground subpixel-antialiased">
      <ChartBackdrop />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[640px] rounded-full bg-cyan-500/[0.12] blur-[140px]" />
        <div className="absolute -bottom-48 -right-40 size-[560px] rounded-full bg-blue-600/[0.10] blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 size-[420px] -translate-x-1/2 rounded-full bg-cyan-400/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[380px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.55)_100%)]" />
      </div>
      <OnboardingStoreBinder userId={user?.id ?? null}>
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </OnboardingStoreBinder>
    </div>
  );
}
