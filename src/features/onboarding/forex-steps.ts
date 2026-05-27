export const FOREX_STEPS = [
  {
    slug: "market",
    num: 1,
    label: "Market",
    whyTitle: "Why we ask",
    whyText:
      "Knowing your market helps us tailor every tool, term, and protection to how you actually trade.",
  },
  {
    slug: "forex/experience",
    num: 2,
    label: "Experience",
    whyTitle: "Why we ask",
    whyText:
      "Your experience level helps us calibrate the depth of guidance and the strength of behavioral protections.",
  },
  {
    slug: "forex/profile",
    num: 3,
    label: "Trading Profile",
    whyTitle: "Why we ask",
    whyText:
      "Your pairs, sessions, and timeframes shape which patterns we surface and when we intervene.",
  },
  {
    slug: "forex/setups",
    num: 4,
    label: "Setups",
    whyTitle: "Why this matters",
    whyText:
      "Your setups become your journal tags, behavior analytics, and the foundation for intervention logic.",
  },
  {
    slug: "forex/behavioral",
    num: 5,
    label: "Behavioral",
    whyTitle: "Why this matters",
    whyText:
      "Forex runs 24/5. Recognizing the situations that affect your execution turns awareness into protection.",
  },
  {
    slug: "forex/risk",
    num: 6,
    label: "Risk Framework",
    whyTitle: "Why this matters",
    whyText:
      "Your framework is designed to protect you from emotional decisions — not restrict your edge.",
  },
  {
    slug: "forex/platform",
    num: 7,
    label: "Platform & Broker",
    whyTitle: "Why connect?",
    whyText:
      "Secure connections power your journal, performance analytics, and real-time behavioral insights.",
  },
] as const;

export type ForexStepSlug = (typeof FOREX_STEPS)[number]["slug"];

export function getForexStepBySlug(slug: string) {
  return FOREX_STEPS.find((s) => s.slug === slug);
}
