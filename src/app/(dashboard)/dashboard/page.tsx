import { ActiveInterventions } from "@/features/dashboard/components/active-interventions";
import { ActiveRisk } from "@/features/dashboard/components/active-risk";
import { BehaviorFeed } from "@/features/dashboard/components/behavior-feed";
import { BehaviorProgress } from "@/features/dashboard/components/behavior-progress";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { MonitoringStrip } from "@/features/dashboard/components/monitoring-strip";
import { OpenPositions } from "@/features/dashboard/components/open-positions";
import { PreSessionChecklist } from "@/features/dashboard/components/pre-session-checklist";
import { ReflectionCard } from "@/features/dashboard/components/reflection-card";
import { RulesRiskStatus } from "@/features/dashboard/components/rules-risk-status";
import { StatTiles } from "@/features/dashboard/components/stat-tiles";
import { TodaysObjective } from "@/features/dashboard/components/todays-objective";
import { TodaysPatterns } from "@/features/dashboard/components/todays-patterns";
import { WeeklyReview } from "@/features/dashboard/components/weekly-review";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Derive the trader's first name from auth metadata. Falls back through
// `display_name` (mirrored on profiles via handle_new_user trigger), then
// the email local-part, then the generic "Trader" greeting.
function firstNameFrom(user: {
  user_metadata?: { full_name?: string; display_name?: string };
  email?: string | null;
}): string {
  const full =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.display_name as string | undefined) ??
    "";
  const trimmed = full.trim();
  if (trimmed.length > 0) {
    return trimmed.split(/\s+/)[0];
  }
  const emailLocal = user.email?.split("@")[0] ?? "";
  if (emailLocal.length > 0) {
    // Capitalize the first character so "cruzh5150" reads as "Cruzh5150".
    return emailLocal[0].toUpperCase() + emailLocal.slice(1);
  }
  return "Trader";
}

// Vertical rhythm:
//   gap-5  → between major rows (premium breathing room, tightened from gap-6)
//   gap-4  → within a row of cards (slightly closer to read as a unit)
// The "Daily Context" delimiter inserts a quiet section break before the
// secondary tier so Reflection / Pre-Session Checklist / Today's Patterns
// read as supportive context, not as peers of the live monitoring row.

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName = user ? firstNameFrom(user) : "Trader";

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader name={firstName} />

      {/* Tier 0 — Action-first surface:
            1. Today's Objective  — single behavioral focus for the session
            2. Session State      — the trader's current behavioral state
            3. Weekly Review      — recent 7-day context
          The rest of the Dashboard reads as supporting context below. */}
      <TodaysObjective />
      <StatTiles />
      <WeeklyReview />
      <BehaviorProgress />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Left / main column */}
        <div className="flex flex-col gap-5">
          {/* Tier 2 — Live behavioral monitoring */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
            <BehaviorFeed />
            <ActiveRisk />
            <ActiveInterventions />
          </div>

          {/* Tier 3 — Daily Context (secondary, quieter chrome on each card) */}
          <section className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-3 pl-1">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
                Daily Context
              </span>
              <span
                aria-hidden
                className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <TodaysPatterns />
              <PreSessionChecklist />
              <ReflectionCard />
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <OpenPositions />
          <RulesRiskStatus />
        </div>
      </div>

      <MonitoringStrip />
    </div>
  );
}
