export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  journal: "/journal",
  trades: "/trades",
  account: "/account",
  accountSecurity: "/account/security",
  accountBilling: "/account/billing",
  docs: "/docs",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
