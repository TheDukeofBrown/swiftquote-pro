import { FileText, Send, Check, Plus } from "lucide-react";

export default function HeroMockup() {
  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="relative mx-auto w-[280px] md:w-[320px] h-[560px] md:h-[640px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
        {/* Screen */}
        <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden border border-border">
          {/* Status bar */}
          <div className="h-6 bg-muted/50 flex items-center justify-between px-6 text-[10px] text-muted-foreground">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-muted-foreground/50 rounded-sm"></div>
            </div>
          </div>
          
          {/* App header */}
          <div className="px-4 py-3 border-b border-border bg-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-foreground" />
                <span className="font-semibold text-primary-foreground text-sm">New Quote</span>
              </div>
              <span className="text-xs text-primary-foreground/80">Q-2024-047</span>
            </div>
          </div>

          {/* Quote content */}
          <div className="p-4 space-y-4 overflow-hidden">
            {/* Customer */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Customer</label>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-sm font-medium">Mrs. Sarah Thompson</p>
                <p className="text-xs text-muted-foreground">12 Oak Lane, Bristol BS1 4DJ</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-medium">Items</label>
                <button className="text-xs text-primary flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                <div className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">Bathroom installation</p>
                      <p className="text-xs text-muted-foreground">Labour</p>
                    </div>
                    <p className="text-sm font-semibold">£1,200</p>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">Radiator installation</p>
                      <p className="text-xs text-muted-foreground">Labour × 2</p>
                    </div>
                    <p className="text-sm font-semibold">£360</p>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">Materials allowance</p>
                      <p className="text-xs text-muted-foreground">Materials</p>
                    </div>
                    <p className="text-sm font-semibold">£450</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold text-primary">£2,010.00</span>
              </div>
            </div>

            {/* Send button */}
            <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              Send Quote
            </button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
      
      {/* Floating badge */}
      <div className="absolute -right-2 md:-right-8 top-24 bg-card border border-border rounded-lg p-3 shadow-lg animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-xs font-medium">Quote Accepted</p>
            <p className="text-[10px] text-muted-foreground">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
