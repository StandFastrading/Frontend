"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { docsSidebar } from "@/config/docs";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0">
      <nav className="flex flex-col gap-6">
        {docsSidebar.map((section) => (
          <div key={section.label}>
            <h3 className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.label}
            </h3>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const href = `/docs/${item.slug}`;
                const isActive = pathname === href;
                return (
                  <li key={item.slug}>
                    <Link
                      href={href}
                      className={cn(
                        "block rounded-md px-2 py-1 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
