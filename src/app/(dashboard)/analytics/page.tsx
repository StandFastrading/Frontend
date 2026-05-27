import { AnalyticsPage } from "@/features/analytics/analytics-page";

// Behavioral Analytics route — the psychological command center.
//
// All state is read client-side from the persisted store, so this route
// just mounts the composed shell. Dashboard layout already provides
// dark mode + the navigation rail.

export default function Page() {
  return <AnalyticsPage />;
}
