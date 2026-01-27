import { Link, useNavigate } from "react-router-dom";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { brands, platformBrand } from "@/config/brands";
import { ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import HeroMockup from "@/components/landing/HeroMockup";

export default function ElectriciansLanding() {
  const { selectBrand } = useBrand();
  const navigate = useNavigate();
  const brand = brands.electrician;

  const handleGetStarted = () => {
    selectBrand("electrician");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6" style={{ color: `hsl(${brand.primaryHue} 70% 45%)` }} />
            <span className="font-bold text-xl">{brand.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Login</Button>
            </Link>
            <Button onClick={handleGetStarted}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: `hsl(${brand.primaryHue} 70% 45% / 0.1)`,
                  color: `hsl(${brand.primaryHue} 70% 35%)`
                }}
              >
                <Zap className="w-4 h-4" />
                Built for Electricians
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Professional electrical quotes in 60 seconds
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                Stop losing time to admin. Quote on site, send instantly, and win more work with professional proposals customers trust.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Pre-loaded electrical rates and services",
                  "Branded PDFs that look professional",
                  "Track when quotes are viewed and accepted",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                className="px-8"
                onClick={handleGetStarted}
                style={{ 
                  backgroundColor: `hsl(${brand.primaryHue} 70% 45%)`,
                }}
              >
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 bg-muted/30">
        <div className="container text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Simple, fair pricing</h2>
          <p className="text-muted-foreground mb-2">7-day free trial. No card required.</p>
          <p className="text-muted-foreground mb-6">Cancel anytime.</p>
          <p className="text-3xl font-bold text-foreground mb-8">From £15/month</p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            style={{ 
              backgroundColor: `hsl(${brand.primaryHue} 70% 45%)`,
            }}
          >
            Start Your Free Trial <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground mb-1">
            {brand.name} — Part of {platformBrand.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Professional quoting for UK electricians.
          </p>
        </div>
      </footer>
    </div>
  );
}