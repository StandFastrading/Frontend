import { ROUTES } from "./routes";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: "LayoutDashboard" },
  { label: "Journal", href: ROUTES.journal, icon: "BookOpen" },
  { label: "Trades", href: ROUTES.trades, icon: "TrendingUp" },
  { label: "Account", href: ROUTES.account, icon: "User" },
];
