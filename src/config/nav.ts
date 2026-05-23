import { ROUTES } from "./routes";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: "LayoutDashboard" },
  { label: "Trade Desk", href: "#", icon: "LineChart" },
  { label: "Rules & Risk", href: "#", icon: "ShieldCheck" },
  { label: "Behavior Analytics", href: "#", icon: "Brain" },
  { label: "Journal", href: ROUTES.journal, icon: "BookOpen" },
  { label: "Trade History", href: ROUTES.trades, icon: "History" },
  { label: "Reports", href: "#", icon: "FileText" },
  { label: "Calendar", href: "#", icon: "Calendar" },
  { label: "Settings", href: ROUTES.account, icon: "Settings" },
];
