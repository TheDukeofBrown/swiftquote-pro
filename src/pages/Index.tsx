import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { ArrowRight, CheckCircle, Zap, Shield, Loader2, Droplets, HardHat, PaintBucket } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { brands } from "@/config/brands";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  const { brand } = useBrand();
  const navigate = useNavigate();

  // Only auto-redirect users who have completed onboarding (have a company)
  useEffect(() => {
    if (!authLoading && !companyLoading && user && company) {
      navigate("/dashboard");
    }
  }, [user, company, authLoading, companyLoading, navigate]);

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tradeProducts = [
    { ...brands.plumber, Icon: Droplets },
    { ...brands.electrician, Icon: Zap },
    { ...brands.plasterer, Icon: PaintBucket },
    { ...brands.builder, Icon: HardHat },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <BrandLogo />
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
      <section className="py-20 md:py-32">
        <div className="container text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Professional Quotes
            <br />
            <span className="text-gradient">In Under 60 Seconds</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {brand.tagline}. Built for builders, plumbers, electricians, and plasterers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center animate-slide-up">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Create professional quotes in seconds, not hours. Pre-filled templates for your trade.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Track Everything</h3>
              <p className="text-muted-foreground">
                Know when quotes are viewed and accepted. Never lose track of a job again.
              </p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Look Professional</h3>
              <p className="text-muted-foreground">
                Impress customers with clean, branded quotes that build trust and win jobs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Products */}
      <section className="py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">One Platform, Four Brands</h2>
            <p className="text-muted-foreground">
              Choose your trade and get a fully branded quoting experience
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {tradeProducts.map((product) => (
              <div
                key={product.id}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
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
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{product.tagline}</p>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-hero-gradient text-primary-foreground">
        <div className="container text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Save Time?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Join thousands of UK tradespeople who've ditched paper quotes.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="px-8">
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}. Built for UK tradespeople.
          </p>
        </div>
      </footer>
    </div>
  );
}
