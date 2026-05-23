import { DocsSidebar } from "@/features/docs/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
      <DocsSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
