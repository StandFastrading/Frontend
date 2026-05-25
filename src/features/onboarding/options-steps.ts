export const OPTIONS_STEPS = [
  {
    slug: "market",
    num: 1,
    label: "Market",
    whyTitle: "Why we ask",
    whyText:
      "Knowing your market helps us tailor every tool, term, and protection to how you actually trade.",
  },
  {
    slug: "options/experience",
    num: 2,
    label: "Experience",
    whyTitle: "Why we ask",
    whyText:
      "Your experience level helps us calibrate the depth of explanations and the strength of the behavioral protections we apply.",
  },
  {
    slug: "options/profile",
    num: 3,
    label: "Trading Profile",
    whyTitle: "Why we ask",
    whyText:
      "Your style — products, expirations, contract size — shapes which patterns we surface and which interventions we trigger.",
  },
  {
    slug: "options/strategies",
    num: 4,
    label: "Strategies",
    whyTitle: "Why this matters",
    whyText:
      "Your strategies become your journal tags, your behavior analytics, and the foundation for intervention logic.",
  },
  {
    slug: "options/behavioral",
    num: 5,
    label: "Behavioral",
    whyTitle: "Why this matters",
    whyText:
      "Options are leveraged. Recognizing the situations that affect your decisions is what turns awareness into protection.",
  },
  {
    slug: "options/risk",
    num: 6,
    label: "Risk Framework",
    whyTitle: "Why this matters",
    whyText:
      "Your framework is designed to protect you from emotional decisions — especially when leverage amplifies them.",
  },
] as const;

export type OptionsStepSlug = (typeof OPTIONS_STEPS)[number]["slug"];

export function getOptionsStepBySlug(slug: string) {
  return OPTIONS_STEPS.find((s) => s.slug === slug);
}

export function getOptionsStepByNum(num: number) {
  return OPTIONS_STEPS.find((s) => s.num === num);
}
