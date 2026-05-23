import { ActiveInterventions } from "@/features/dashboard/components/active-interventions";
import { ActiveRisk } from "@/features/dashboard/components/active-risk";
import { BehaviorFeed } from "@/features/dashboard/components/behavior-feed";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { MonitoringStrip } from "@/features/dashboard/components/monitoring-strip";
import { OpenPositions } from "@/features/dashboard/components/open-positions";
import { PreSessionChecklist } from "@/features/dashboard/components/pre-session-checklist";
import { ReflectionCard } from "@/features/dashboard/components/reflection-card";
import { RulesRiskStatus } from "@/features/dashboard/components/rules-risk-status";
import { StatTiles } from "@/features/dashboard/components/stat-tiles";
import { TodaysPatterns } from "@/features/dashboard/components/todays-patterns";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader name="Trader" />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left / main column */}
        <div className="flex flex-col gap-6">
          <StatTiles />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1fr]">
            <BehaviorFeed />
            <ActiveRisk />
            <ActiveInterventions />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TodaysPatterns />
            <PreSessionChecklist />
            <ReflectionCard />
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-6">
          <OpenPositions />
          <RulesRiskStatus />
        </div>
      </div>

      <MonitoringStrip />
    </div>
  );
}
