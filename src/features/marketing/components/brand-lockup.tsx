import Link from "next/link";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

type BrandLockupProps = {
  className?: string;
  markSize?: number;
};

export function BrandLockup({ className, markSize = 28 }: BrandLockupProps) {
  return (
    <Link
      href={ROUTES.home}
      className={cn("flex items-center gap-2.5", className)}
    >
      <BrandMark size={markSize} className="text-foreground" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-base font-semibold tracking-[0.15em]">
          STANDFAST
        </span>
        <span className="mt-1 text-[0.55rem] font-medium tracking-[0.3em] text-muted-foreground">
          TECHNOLOGIES
        </span>
      </span>
    </Link>
  );
}
