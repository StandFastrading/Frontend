export const CRYPTO_STEPS = [
  {
    slug: "market",
    num: 1,
    label: "Market",
    whyTitle: "Why we ask",
    whyText:
      "Knowing your market helps us tailor every tool, term, and protection to how you actually trade.",
  },
  {
    slug: "crypto/experience",
    num: 2,
    label: "Experience",
    whyTitle: "Why we ask",
    whyText:
      "Your experience level helps us calibrate the depth of guidance and the strength of behavioral protections.",
  },
  {
    slug: "crypto/profile",
    num: 3,
    label: "Trading Profile",
    whyTitle: "Why we ask",
    whyText:
      "Your assets, markets, and timeframes shape which patterns we surface and when we intervene.",
  },
  {
    slug: "crypto/setups",
    num: 4,
    label: "Setups",
    whyTitle: "Why this matters",
    whyText:
      "Your setups become your journal tags, behavior analytics, and the foundation for intervention logic.",
  },
  {
    slug: "crypto/behavioral",
    num: 5,
    label: "Behavioral",
    whyTitle: "Why this matters",
    whyText:
      "Crypto is 24/7 and leverage is everywhere. Recognizing the patterns that pull you off plan is your edge.",
  },
  {
    slug: "crypto/risk",
    num: 6,
    label: "Risk Framework",
    whyTitle: "Why this matters",
    whyText:
      "Your framework is designed to protect you from emotional decisions — not restrict your edge.",
  },
  {
    slug: "crypto/platform",
    num: 7,
    label: "Platform & Exchange",
    whyTitle: "Why connect?",
    whyText:
      "Secure connections power your journal, performance analytics, and real-time behavioral insights.",
  },
] as const;

export type CryptoStepSlug = (typeof CRYPTO_STEPS)[number]["slug"];

export function getCryptoStepBySlug(slug: string) {
  return CRYPTO_STEPS.find((s) => s.slug === slug);
}
