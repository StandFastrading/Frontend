import { cn } from "@/lib/utils";

type StandfastLogoProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
  glow?: boolean;
  title?: string;
};

export function StandfastLogo({
  width,
  height,
  className,
  glow = false,
  title = "StandFast Technologies",
}: StandfastLogoProps) {
  const sizing =
    width === undefined && height === undefined
      ? { width: "100%", height: "auto" }
      : { width, height };

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      style={{
        ...sizing,
        filter: glow
          ? "drop-shadow(0 0 14px rgba(43, 168, 224, 0.55)) drop-shadow(0 0 28px rgba(43, 168, 224, 0.25))"
          : undefined,
      }}
      className={cn("block max-w-full select-none", className)}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="sfFadeBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C8CCD0" stopOpacity="0" />
          <stop offset="0.45" stopColor="#C8CCD0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#D8DCE0" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="sfSubtitle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D4D8DC" />
          <stop offset="1" stopColor="#8E9298" />
        </linearGradient>
      </defs>

      <g>
        <rect x="160" y="130" width="140" height="14" fill="url(#sfFadeBar)" />
        <rect x="300" y="130" width="140" height="14" fill="#2BA8E0" />
        <rect x="292" y="95" width="16" height="110" fill="#2BA8E0" />
      </g>

      <text
        x="300"
        y="280"
        fontFamily="'Geist', 'Inter', 'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontWeight={900}
        fontSize={76}
        letterSpacing={2}
        textAnchor="middle"
        fill="#FFFFFF"
      >
        STANDFAST
      </text>

      <text
        x="300"
        y="325"
        fontFamily="'Geist', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontWeight={500}
        fontSize={22}
        letterSpacing={14}
        textAnchor="middle"
        fill="url(#sfSubtitle)"
      >
        TECHNOLOGIES
      </text>
    </svg>
  );
}

export default StandfastLogo;
