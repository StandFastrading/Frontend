export const ROUTES = {
  home: "/",
  auth: "/auth",
  dashboard: "/dashboard",
  desk: "/desk",
  rulesRisk: "/rules-risk",
  analytics: "/analytics",
  journal: "/journal",
  trades: "/trades",
  reports: "/reports",
  calendar: "/calendar",
  account: "/account",
  accountSecurity: "/account/security",
  accountBilling: "/account/billing",
  onboarding: "/onboarding",
  onboardingMarket: "/onboarding/market",
  docs: "/docs",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
