import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export function BrandMark({ className, size = 28 }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      className={cn(className)}
    >
      <path
        d="M5 4 H23"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 4 V24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="11.5"
        y="10"
        width="5"
        height="10"
        rx="1"
        className="fill-brand"
      />
    </svg>
  );
}
