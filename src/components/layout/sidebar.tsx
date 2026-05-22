"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Lucide from "lucide-react";

import { dashboardNav } from "@/config/nav";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

const iconMap = Lucide as unknown as Record<
  string,
  React.ComponentType<{ className?: string }>
>;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
      <Link
        href={ROUTES.home}
        className="block px-2 pb-4 text-lg font-semibold tracking-tight"
      >
        Standfast
      </Link>
      <nav className="flex flex-col gap-1">
        {dashboardNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="size-4" /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
