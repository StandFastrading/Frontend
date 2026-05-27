type Candle = {
  x: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  bullish: boolean;
};

const LEFT_CANDLES: Candle[] = [
  { x: 0, openY: 230, closeY: 260, highY: 215, lowY: 275, bullish: false },
  { x: 18, openY: 260, closeY: 225, highY: 215, lowY: 270, bullish: true },
  { x: 36, openY: 225, closeY: 195, highY: 180, lowY: 235, bullish: true },
  { x: 54, openY: 195, closeY: 215, highY: 188, lowY: 230, bullish: false },
  { x: 72, openY: 215, closeY: 180, highY: 165, lowY: 225, bullish: true },
  { x: 90, openY: 180, closeY: 150, highY: 135, lowY: 195, bullish: true },
  { x: 108, openY: 150, closeY: 165, highY: 140, lowY: 180, bullish: false },
  { x: 126, openY: 165, closeY: 125, highY: 110, lowY: 175, bullish: true },
  { x: 144, openY: 125, closeY: 105, highY: 90, lowY: 140, bullish: true },
  { x: 162, openY: 105, closeY: 135, highY: 95, lowY: 150, bullish: false },
  { x: 180, openY: 135, closeY: 95, highY: 80, lowY: 150, bullish: true },
  { x: 198, openY: 95, closeY: 115, highY: 85, lowY: 130, bullish: false },
  { x: 216, openY: 115, closeY: 80, highY: 65, lowY: 130, bullish: true },
  { x: 234, openY: 80, closeY: 60, highY: 45, lowY: 95, bullish: true },
];

const RIGHT_CANDLES: Candle[] = [
  { x: 0, openY: 80, closeY: 110, highY: 65, lowY: 125, bullish: false },
  { x: 18, openY: 110, closeY: 90, highY: 75, lowY: 125, bullish: true },
  { x: 36, openY: 90, closeY: 130, highY: 85, lowY: 145, bullish: false },
  { x: 54, openY: 130, closeY: 165, highY: 125, lowY: 180, bullish: false },
  { x: 72, openY: 165, closeY: 145, highY: 130, lowY: 180, bullish: true },
  { x: 90, openY: 145, closeY: 185, highY: 140, lowY: 200, bullish: false },
  { x: 108, openY: 185, closeY: 215, highY: 180, lowY: 230, bullish: false },
  { x: 126, openY: 215, closeY: 195, highY: 180, lowY: 230, bullish: true },
  { x: 144, openY: 195, closeY: 230, highY: 190, lowY: 250, bullish: false },
  { x: 162, openY: 230, closeY: 210, highY: 200, lowY: 245, bullish: true },
  { x: 180, openY: 210, closeY: 245, highY: 205, lowY: 260, bullish: false },
  { x: 198, openY: 245, closeY: 270, highY: 240, lowY: 285, bullish: false },
  { x: 216, openY: 270, closeY: 250, highY: 240, lowY: 285, bullish: true },
  { x: 234, openY: 250, closeY: 285, highY: 245, lowY: 300, bullish: false },
];

const BULL = "#22c55e";
const BEAR = "#ef4444";

function CandleStream({ candles }: { candles: Candle[] }) {
  return (
    <svg
      width="260"
      height="320"
      viewBox="0 0 260 320"
      fill="none"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      {candles.map((c, i) => {
        const color = c.bullish ? BULL : BEAR;
        const top = Math.min(c.openY, c.closeY);
        const height = Math.max(4, Math.abs(c.openY - c.closeY));
        return (
          <g key={i} stroke={color} fill={color}>
            <line
              x1={c.x + 6}
              y1={c.highY}
              x2={c.x + 6}
              y2={c.lowY}
              strokeWidth="1.5"
            />
            <rect x={c.x} y={top} width={12} height={height} rx={1} />
          </g>
        );
      })}
    </svg>
  );
}

export function ChartBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-4 top-[6%] hidden h-[320px] w-[260px] opacity-[0.18] blur-[3px] md:block">
        <CandleStream candles={LEFT_CANDLES} />
      </div>
      <div className="absolute -right-4 top-[10%] hidden h-[260px] w-[220px] -scale-x-100 opacity-[0.16] blur-[3px] md:block">
        <CandleStream candles={RIGHT_CANDLES} />
      </div>
      <div className="absolute right-[-30px] bottom-[6%] hidden h-[320px] w-[260px] opacity-[0.16] blur-[3px] md:block">
        <CandleStream candles={RIGHT_CANDLES} />
      </div>
      <div className="absolute -left-6 bottom-[4%] hidden h-[280px] w-[230px] -scale-x-100 opacity-[0.14] blur-[3px] md:block">
        <CandleStream candles={LEFT_CANDLES} />
      </div>
      <div className="absolute left-[8%] top-1/2 hidden h-[200px] w-[170px] -translate-y-1/2 opacity-[0.10] blur-[3px] lg:block">
        <CandleStream candles={RIGHT_CANDLES} />
      </div>
      <div className="absolute right-[8%] top-1/2 hidden h-[200px] w-[170px] -translate-y-1/2 -scale-x-100 opacity-[0.10] blur-[3px] lg:block">
        <CandleStream candles={LEFT_CANDLES} />
      </div>
      <div className="absolute left-1/2 top-[2%] hidden h-[180px] w-[150px] -translate-x-1/2 opacity-[0.08] blur-[4px] lg:block">
        <CandleStream candles={LEFT_CANDLES} />
      </div>
      <div className="absolute bottom-[2%] left-1/2 hidden h-[180px] w-[150px] -translate-x-1/2 -scale-x-100 opacity-[0.08] blur-[4px] lg:block">
        <CandleStream candles={RIGHT_CANDLES} />
      </div>
      <div className="absolute bottom-[4%] left-[52%] hidden h-[260px] w-[220px] opacity-[0.16] blur-[3px] lg:block">
        <CandleStream candles={LEFT_CANDLES} />
      </div>
    </div>
  );
}
