import { cn } from "@/lib/utils";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type Candle = {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
};

const VIEWBOX = { w: 800, h: 320 };
const CANDLE_COUNT = 34;
const CANDLE_SPACING = 22;
const CANDLE_WIDTH = 10;
const START_X = 24;

const CANDLES: Candle[] = (() => {
  const rng = seededRandom(7);
  const list: Candle[] = [];
  let price = 230;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const x = START_X + i * CANDLE_SPACING;
    const change = (rng() - 0.42) * 26;
    const close = Math.max(40, Math.min(280, price + change));
    const wickRange = 8 + rng() * 18;
    const high = Math.min(price, close) - rng() * wickRange;
    const low = Math.max(price, close) + rng() * wickRange;
    list.push({ x, open: price, close, high, low });
    price = close;
  }
  return list;
})();

type HeroCandlesProps = {
  className?: string;
};

export function HeroCandles({ className }: HeroCandlesProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn("h-full w-full", className)}
      style={{
        maskImage:
          "linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 60%, transparent 95%)",
        WebkitMaskImage:
          "linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 60%, transparent 95%)",
      }}
    >
      <g stroke="white" strokeOpacity="0.18" strokeWidth="1" strokeLinecap="round">
        {CANDLES.map((c, i) => (
          <line key={`w${i}`} x1={c.x} x2={c.x} y1={c.high} y2={c.low} />
        ))}
      </g>
      <g fill="white" fillOpacity="0.12">
        {CANDLES.map((c, i) => {
          const top = Math.min(c.open, c.close);
          const height = Math.max(2, Math.abs(c.close - c.open));
          return (
            <rect
              key={`b${i}`}
              x={c.x - CANDLE_WIDTH / 2}
              y={top}
              width={CANDLE_WIDTH}
              height={height}
              rx="1"
            />
          );
        })}
      </g>
    </svg>
  );
}
