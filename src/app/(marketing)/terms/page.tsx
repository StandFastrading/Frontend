import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Standfast",
  description: "Terms that govern your use of Standfast.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-4 text-muted-foreground">
        Coming soon. Full terms will be published ahead of public launch.
      </p>
    </main>
  );
}
