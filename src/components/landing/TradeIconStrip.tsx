import { Droplets, Zap, PaintBucket, HardHat, Paintbrush, Home } from "lucide-react";

const trades = [
  { name: "Plumber", Icon: Droplets, hue: 200 },
  { name: "Electrician", Icon: Zap, hue: 220 },
  { name: "Plasterer", Icon: PaintBucket, hue: 240 },
  { name: "Builder", Icon: HardHat, hue: 215 },
  { name: "Painter", Icon: Paintbrush, hue: 160 },
  { name: "Roofer", Icon: Home, hue: 220 },
];

export default function TradeIconStrip() {
  return (
    <div className="py-8 border-y border-border bg-muted/20">
      <div className="container">
        <p className="text-center text-sm text-muted-foreground mb-6 font-medium">
          Built for UK trades
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {trades.map((trade) => (
            <div key={trade.name} className="flex flex-col items-center gap-2 group">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `hsl(${trade.hue} 70% 45% / 0.1)` }}
              >
                <trade.Icon 
                  className="w-6 h-6"
                  style={{ color: `hsl(${trade.hue} 70% 45%)` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{trade.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
