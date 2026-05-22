import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

export default function MarketingHomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">Standfast</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        A trading journal that helps day traders maintain emotional control.
      </p>
      <div className="flex gap-3">
        <Link href={ROUTES.signup} className={cn(buttonVariants({ size: "lg" }))}>
          Get started
        </Link>
        <Link
          href={ROUTES.docs}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Learn more
        </Link>
      </div>
    </main>
  );
}
