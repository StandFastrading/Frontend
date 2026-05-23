import Link from "next/link";

import { ROUTES } from "@/config/routes";

import { BrandLockup } from "./brand-lockup";

const FOOTER_LINKS = [
  { href: ROUTES.privacy, label: "Privacy Policy" },
  { href: ROUTES.terms, label: "Terms of Service" },
  { href: ROUTES.docs, label: "Docs" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3 max-w-sm">
          <BrandLockup markSize={24} />
          <p className="text-sm text-muted-foreground">
            Behavioral intervention software for active traders. Built to help
            you win the inner game.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm md:items-end">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Standfast Technologies.</span>
          <span>All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
