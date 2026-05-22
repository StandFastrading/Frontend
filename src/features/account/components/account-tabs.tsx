"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Profile", href: ROUTES.account },
  { label: "Security", href: ROUTES.accountSecurity },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
