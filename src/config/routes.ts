export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  desk: "/desk",
  rulesRisk: "/rules-risk",
  analytics: "/analytics",
  journal: "/journal",
  trades: "/trades",
  account: "/account",
  accountSecurity: "/account/security",
  accountBilling: "/account/billing",
  onboarding: "/onboarding",
  docs: "/docs",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
