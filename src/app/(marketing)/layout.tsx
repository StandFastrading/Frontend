import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <Link
          href={ROUTES.home}
          className="text-sm font-semibold tracking-tight"
        >
          Standfast
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href={ROUTES.docs}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Docs
          </Link>
          <Link
            href={ROUTES.login}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </Link>
          <Link
            href={ROUTES.signup}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Get started
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
