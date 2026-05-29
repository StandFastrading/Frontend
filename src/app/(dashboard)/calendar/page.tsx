import { CalendarPage } from "@/features/calendar/calendar-page";

// Calendar route — clean trading calendar built on top of the existing
// closed-trade archive. All aggregation lives in
// `features/calendar/calendar-engine.ts`.

export default function Page() {
  return <CalendarPage />;
}
