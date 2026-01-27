import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, FileText, Eye, Brain, Loader2, Droplets, HardHat, PaintBucket, Paintbrush, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { brands, BrandConfig, platformBrand } from "@/config/brands";
import type { Database } from "@/integrations/supabase/types";
import PhoneMockup from "@/components/landing/PhoneMockup";
import TradeIconStrip from "@/components/landing/TradeIconStrip";
import FeatureScreenshotStrip from "@/components/landing/FeatureScreenshotStrip";
import QuotePDFPreview from "@/components/landing/QuotePDFPreview";

type TradeType = Database["public"]["Enums"]["trade_type"];

const tradeCardCopy: Record<TradeType, { tagline: string; cta: string }> = {
  plumber: {
    tagline: "Fast, professional plumbing quotes — sent on site.",
    cta: "For Plumbers",
  },
  electrician: {
    tagline: "Clear electrical quotes that look professional and win work.",
    cta: "For Electricians",
  },
  plasterer: {
    tagline: "Simple, clean quotes clients understand instantly.",
    cta: "For Plasterers",
  },
  builder: {
    tagline: "Multi-line building quotes without spreadsheets.",
    cta: "For Builders",
  },
  painter: {
    tagline: "Straightforward decorating quotes, priced properly.",
    cta: "For Painters",
  },
  roofer: {
    tagline: "Fast roofing quotes without paperwork.",
    cta: "For Roofers",
  },
};

export default function Index() {
  const { loading: authLoading } = useAuth();
  const { loading: companyLoading } = useCompany();
  const { brand, selectBrand } = useBrand();
  const navigate = useNavigate();

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tradeProducts: (BrandConfig & { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> })[] = [
    { ...brands.plumber, Icon: Droplets },
    { ...brands.electrician, Icon: Zap },
    { ...brands.plasterer, Icon: PaintBucket },
    { ...brands.builder, Icon: HardHat },
    { ...brands.painter, Icon: Paintbrush },
    { ...brands.roofer, Icon: Home },
  ];

  const handleSelectTrade = (tradeId: TradeType) => {
    selectBrand(tradeId);
    navigate("/auth");
  };

  // Get accent color from selected brand
  const accentHue = brand.primaryHue?.toString() || "220";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">{platformBrand.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-20 overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
                {platformBrand.name}
              </h1>
              <p className="text-xl md:text-2xl font-medium text-foreground mb-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
                Professional quotes for trades — in under 60 seconds.
              </p>
              <div className="text-lg text-muted-foreground mb-6 animate-fade-in space-y-1" style={{ animationDelay: "0.1s" }}>
                <p>No paperwork. No spreadsheets. No evenings lost to admin.</p>
              </div>
              <p className="text-base text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
                Built for busy trades who just want to get the job priced and sent.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <Button size="lg" className="px-8" onClick={() => document.getElementById('trade-selector')?.scrollIntoView({ behavior: 'smooth' })}>
                  Choose Your Trade <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Phone mockup with screenshot */}
            <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <PhoneMockup accentColor={accentHue} />
            </div>
          </div>
        </div>
      </section>

      {/* Trade Icon Strip */}
      <TradeIconStrip />

      {/* Sub-Hero (Clarity) */}
      <section className="py-12">
        <div className="container text-center max-w-2xl">
          <p className="text-lg md:text-xl text-foreground mb-4">
            Quoting shouldn't slow your business down.
          </p>
          <p className="text-muted-foreground mb-6">
            WorkQuote gives you a trade-specific quoting tool, built around how you actually work.
          </p>
          <p className="text-sm font-medium text-primary">
            Select your trade below to get started.
          </p>
        </div>
      </section>

      {/* Trade Selector */}
      <section id="trade-selector" className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">One platform. Trade-specific quoting tools.</h2>
            <p className="text-muted-foreground">
              Each trade gets its own experience, pricing defaults, and language — all powered by WorkQuote.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tradeProducts.map((product) => (
              <div
                key={product.id}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => handleSelectTrade(product.id)}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `hsl(${product.primaryHue} 70% 45% / 0.1)` }}
                >
                  <product.Icon
                    className="w-6 h-6"
                    style={{ color: `hsl(${product.primaryHue} 70% 45%)` }}
                  />
                </div>
                <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {tradeCardCopy[product.id].tagline}
                </p>
                <Button 
                  className="w-full group-hover:opacity-100 opacity-80 transition-opacity"
                  style={{ 
                    backgroundColor: `hsl(${product.primaryHue} 70% 45%)`,
                    color: 'white'
                  }}
                >
                  {tradeCardCopy[product.id].cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Screenshot Strip */}
      <FeatureScreenshotStrip tradeName="trades" />

      {/* Quote PDF Preview */}
      <QuotePDFPreview />

      {/* Features */}
      <section className="py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Why trades use WorkQuote</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center animate-slide-up">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quote in minutes</h3>
              <p className="text-muted-foreground text-sm">
                Create and send professional quotes from your phone.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Look professional</h3>
              <p className="text-muted-foreground text-sm">
                Clean, branded PDFs customers trust.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Stay in control</h3>
              <p className="text-muted-foreground text-sm">
                See when quotes are viewed and accepted.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Built for trades</h3>
              <p className="text-muted-foreground text-sm">
                Defaults, language, and pricing that match your work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 bg-muted/30">
        <div className="container text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Simple pricing.</h2>
          <p className="text-muted-foreground mb-2">7-day free trial.</p>
          <p className="text-muted-foreground mb-6">Cancel anytime.</p>
          <p className="text-xl font-semibold text-foreground">From £15 per month.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-hero-gradient text-primary-foreground">
        <div className="container text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Stop losing time to admin.</h2>
          <p className="text-xl text-primary-foreground/90 mb-8">Start quoting properly.</p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="px-8"
            onClick={() => document.getElementById('trade-selector')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Choose Your Trade & Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground mb-1">
            © {new Date().getFullYear()} {platformBrand.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Professional quoting tools for UK trades.
          </p>
        </div>
      </footer>
    </div>
  );
}
