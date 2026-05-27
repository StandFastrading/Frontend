import { ChartBackdrop } from "@/features/onboarding/components/chart-backdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex flex-1 flex-col overflow-hidden bg-[#040711] text-foreground subpixel-antialiased">
      <ChartBackdrop />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[640px] rounded-full bg-brand/[0.10] blur-[140px]" />
        <div className="absolute -bottom-48 -right-40 size-[560px] rounded-full bg-brand/[0.08] blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 size-[420px] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.55)_100%)]" />
      </div>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
