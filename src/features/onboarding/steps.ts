export const STEPS = [
  {
    slug: "market",
    num: 1,
    label: "Market",
    whyTitle: "Why we ask",
    whyText:
      "Knowing your market helps us tailor every tool, term, and insight to how you actually trade.",
  },
  {
    slug: "experience",
    num: 2,
    label: "Experience",
    whyTitle: "Why we ask",
    whyText:
      "Your answers help StandFast personalize your dashboard, interventions, and insights so we can help you trade with discipline and clarity.",
  },
  {
    slug: "profile",
    num: 3,
    label: "Trading Profile",
    whyTitle: "Why we ask",
    whyText:
      "Your answers help StandFast personalize your dashboard, interventions, and insights so we can help you trade with discipline and clarity.",
  },
  {
    slug: "goals",
    num: 4,
    label: "Top Goals",
    whyTitle: "Why we ask",
    whyText:
      "Your answers help StandFast prioritize what matters most, surface the right insights, and help you build a plan aligned with your goals.",
  },
  {
    slug: "setups",
    num: 5,
    label: "Setups",
    whyTitle: "Why setups matter",
    whyText:
      "Your setups help StandFast understand the opportunities you look for so we can surface better insights, scans, and interventions for you.",
  },
  {
    slug: "behavioral",
    num: 6,
    label: "Behavioral Check-In",
    whyTitle: "Why this matters",
    whyText:
      "Self-awareness is a superpower. Identifying your strengths, triggers, and risk tendencies helps us deliver the right insights and support when you need them most.",
  },
  {
    slug: "risk",
    num: 7,
    label: "Risk Framework",
    whyTitle: "Why this matters",
    whyText:
      "A clear risk framework keeps your trading sustainable and protects your capital so you can stay in the game longer.",
  },
  {
    slug: "platform",
    num: 8,
    label: "Platform & Broker",
    whyTitle: "Why connect?",
    whyText:
      "Secure connections power your journal, performance analytics, and real-time behavioral insights.",
  },
  {
    slug: "review",
    num: 9,
    label: "Review & Activate",
    whyTitle: "Why review?",
    whyText:
      "A quick review ensures everything is set up the way you want it — so we can deliver insights that actually make a difference.",
  },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function getStepBySlug(slug: string) {
  return STEPS.find((s) => s.slug === slug);
}

export function getStepByNum(num: number) {
  return STEPS.find((s) => s.num === num);
}
