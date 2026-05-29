import { ROUTES } from "./routes";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: "LayoutDashboard" },
  { label: "Rules & Risk", href: ROUTES.rulesRisk, icon: "ShieldCheck" },
  { label: "Trade Desk", href: ROUTES.desk, icon: "LineChart" },
  { label: "Behavior Analytics", href: ROUTES.analytics, icon: "Brain" },
  { label: "Journal", href: ROUTES.journal, icon: "BookOpen" },
  { label: "Trade History", href: ROUTES.trades, icon: "History" },
  { label: "Reports", href: ROUTES.reports, icon: "FileText" },
  { label: "Calendar", href: ROUTES.calendar, icon: "Calendar" },
  { label: "Settings", href: ROUTES.account, icon: "Settings" },
];
