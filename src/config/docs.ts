export type DocsLink = { label: string; slug: string };
export type DocsSection = { label: string; items: DocsLink[] };

export const docsSidebar: DocsSection[] = [
  {
    label: "Getting started",
    items: [
      { label: "Introduction", slug: "introduction" },
      { label: "Quick start", slug: "quick-start" },
    ],
  },
  {
    label: "Concepts",
    items: [
      { label: "Glossary", slug: "glossary" },
      { label: "Rules", slug: "rules" },
    ],
  },
];
