import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Standfast",
  description: "How Standfast handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">
        Coming soon. We&rsquo;re finalizing the full policy ahead of public
        launch. If you have questions in the meantime, reach out to the team.
      </p>
    </main>
  );
}
