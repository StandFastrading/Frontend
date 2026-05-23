import Link from "next/link";

import { docsSidebar } from "@/config/docs";

export const metadata = {
  title: "Documentation — Standfast",
  description: "How to use Standfast to maintain emotional control in trading.",
};

export default function DocsIndexPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 text-muted-foreground">
          Guides, references, and the vocabulary Standfast uses.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {docsSidebar.flatMap((section) =>
          section.items.map((item) => (
            <Link
              key={item.slug}
              href={`/docs/${item.slug}`}
              className="rounded-lg border p-5 transition-colors hover:bg-accent/30"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
              <div className="mt-1 text-base font-medium">{item.label}</div>
            </Link>
          )),
        )}
      </div>
    </div>
  );
}
