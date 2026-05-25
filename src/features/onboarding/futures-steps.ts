export const FUTURES_STEPS = [
  {
    slug: "market",
    num: 1,
    label: "Market",
    whyTitle: "Why we ask",
    whyText:
      "Knowing your market helps us tailor every tool, term, and protection to how you actually trade.",
  },
  {
    slug: "futures/experience",
    num: 2,
    label: "Experience",
    whyTitle: "Why we ask",
    whyText:
      "Your experience level helps us calibrate the depth of guidance and the strength of behavioral protections.",
  },
  {
    slug: "futures/profile",
    num: 3,
    label: "Trading Profile",
    whyTitle: "Why we ask",
    whyText:
      "Your products, sessions, and contract sizing shape which patterns we surface and when we intervene.",
  },
  {
    slug: "futures/setups",
    num: 4,
    label: "Setups",
    whyTitle: "Why this matters",
    whyText:
      "Your setups become your journal tags, behavior analytics, and the foundation for intervention logic.",
  },
  {
    slug: "futures/behavioral",
    num: 5,
    label: "Behavioral",
    whyTitle: "Why this matters",
    whyText:
      "Futures are leveraged. Recognizing the situations that affect your execution is what turns awareness into protection.",
  },
  {
    slug: "futures/risk",
    num: 6,
    label: "Risk Framework",
    whyTitle: "Why this matters",
    whyText:
      "Your framework is designed to protect you from emotional decisions — not restrict your edge.",
  },
  {
    slug: "futures/platform",
    num: 7,
    label: "Platform & Broker",
    whyTitle: "Why connect?",
    whyText:
      "Secure connections power your journal, performance analytics, and real-time behavioral insights.",
  },
] as const;

export type FuturesStepSlug = (typeof FUTURES_STEPS)[number]["slug"];

export function getFuturesStepBySlug(slug: string) {
  return FUTURES_STEPS.find((s) => s.slug === slug);
}

export function getFuturesStepByNum(num: number) {
  return FUTURES_STEPS.find((s) => s.num === num);
}
