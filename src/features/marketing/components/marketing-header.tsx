"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { BrandLockup } from "./brand-lockup";
import { WaitlistTrigger } from "./waitlist-trigger";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-6">
        <BrandLockup />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </a>
          ))}
          <Link
            href={ROUTES.login}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground",
            )}
          >
            Login
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "md:hidden",
            )}
          >
            Login
          </Link>
          <WaitlistTrigger variant="beta" className="h-9 px-4 text-sm">
            Request Beta Access
          </WaitlistTrigger>
        </div>
      </div>
    </header>
  );
}
