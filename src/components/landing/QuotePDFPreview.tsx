import { Check } from "lucide-react";

export default function QuotePDFPreview() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Quotes that look professional</h2>
          <p className="text-muted-foreground">
            Clean, branded PDFs that customers trust. No more scribbled estimates on the back of receipts.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* PDF Preview */}
            <div className="relative">
              <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-200">
                {/* PDF Header */}
                <div className="bg-primary h-16 px-6 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">Thompson Plumbing</p>
                    <p className="text-white/80 text-xs">07700 900123 • info@thompsonplumbing.co.uk</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">QUOTE</p>
                    <p className="text-white text-lg font-bold">Q-2024-047</p>
                  </div>
                </div>
                
                {/* PDF Content */}
                <div className="p-6 space-y-4">
                  {/* Customer */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Quote For</p>
                    <p className="text-slate-900 font-semibold">Mrs. Sarah Thompson</p>
                    <p className="text-slate-500 text-sm">12 Oak Lane, Bristol BS1 4DJ</p>
                  </div>
                  
                  {/* Items table */}
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 grid grid-cols-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      <span className="col-span-2">Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Amount</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="px-4 py-3 grid grid-cols-4 text-sm">
                        <span className="col-span-2 text-slate-700">Bathroom installation</span>
                        <span className="text-right text-slate-500">1</span>
                        <span className="text-right font-medium">£1,200</span>
                      </div>
                      <div className="px-4 py-3 grid grid-cols-4 text-sm">
                        <span className="col-span-2 text-slate-700">Radiator installation</span>
                        <span className="text-right text-slate-500">2</span>
                        <span className="text-right font-medium">£360</span>
                      </div>
                      <div className="px-4 py-3 grid grid-cols-4 text-sm">
                        <span className="col-span-2 text-slate-700">Materials allowance</span>
                        <span className="text-right text-slate-500">1</span>
                        <span className="text-right font-medium">£450</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-48 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span>£2,010.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">VAT (20%)</span>
                        <span>£402.00</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-primary">£2,412.00</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Accept button representation */}
                  <div className="pt-4">
                    <div className="bg-green-500 text-white text-center py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Accept This Quote
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 text-center">PlumbQuote — Powered by WorkQuote</p>
                </div>
              </div>
              
              {/* Shadow decoration */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none rounded-lg"></div>
            </div>
            
            {/* Features list */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Clear line items & totals</h3>
                  <p className="text-sm text-muted-foreground">Customers see exactly what they're paying for. No confusion, no callbacks.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Your branding, your details</h3>
                  <p className="text-sm text-muted-foreground">Your business name, contact info, and trade branding on every quote.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">One-click acceptance</h3>
                  <p className="text-sm text-muted-foreground">Customers can accept directly. You get notified instantly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">VAT handled automatically</h3>
                  <p className="text-sm text-muted-foreground">VAT registered? It's calculated and shown correctly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
