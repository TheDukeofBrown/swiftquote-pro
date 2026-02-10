import { Building2, ArrowUpRight } from "lucide-react";

const portfolio = {
  "Trade Operations": [
    {
      name: "PayReady",
      description: "Plot-based Payment Packs that support accurate valuation and payment.",
      link: "https://payready.co.uk",
    },
    {
      name: "WorkQuote",
      description: "Professional quotes for trades, created and sent in under 60 seconds.",
      link: "https://workquote.co.uk",
    },
  ],
  "Compliance & Inspection": [
    {
      name: "FireDoor Inspection Pro™",
      description: "Digital fire-door inspections with structured reporting and compliance records.",
      status: "Launching on Lovable",
    },
  ],
  "Professional & Hiring Tools": [
    {
      name: "ApplyReady",
      description: "Recruiter-grade CV analysis and job search operating system.",
      link: "https://applyready.co.uk",
    },
  ],
};

const lanes = [
  {
    title: "Trade Operations",
    description:
      "Software that helps trades price work accurately, evidence delivery, and get paid without friction.",
  },
  {
    title: "Compliance & Inspection",
    description:
      "Digital tools that support regulated inspection workflows and defensible compliance records.",
  },
  {
    title: "Professional & Hiring Tools",
    description:
      "Platforms that help professionals present themselves clearly and progress with confidence.",
  },
];

const footerLinks = [
  { label: "ApplyReady", href: "https://applyready.co.uk" },
  { label: "PayReady", href: "https://payready.co.uk" },
  { label: "WorkQuote", href: "https://workquote.co.uk" },
  { label: "FireDoor Inspection Pro™", href: "#" },
  { label: "Contact", href: "mailto:hello@buildstax.com" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              BuildStax Group
            </span>
          </div>
          <a
            href="mailto:hello@buildstax.com"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-hero-gradient text-primary-foreground overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/[0.02]" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-white/[0.02]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-40">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 max-w-3xl">
            BuildStax Group
          </h1>
          <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-8 max-w-2xl">
            We build and operate focused software platforms for trades, compliance, and professional workflows.
          </p>
          <p className="text-sm text-white/50 italic tracking-wide">
            Simple in the field. Useful in the office. Defensible when it matters.
          </p>
        </div>
      </section>

      {/* WHAT WE BUILD */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            What we build
          </h2>
          <p className="text-muted-foreground mb-14 max-w-xl">
            Three operating lanes, each with its own focus and direction.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {lanes.map((lane) => (
              <div
                key={lane.title}
                className="bg-card border border-border rounded-xl p-7 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-base mb-3 text-foreground">{lane.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lane.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="py-24 md:py-32 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Portfolio
          </h2>
          <p className="text-muted-foreground mb-14 max-w-xl">
            Independent software businesses, each serving a defined market.
          </p>
          <div className="space-y-12">
            {Object.entries(portfolio).map(([lane, products]) => (
              <div key={lane}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                  {lane}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.name}
                      className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg text-foreground">
                            {product.name}
                          </h4>
                          {"link" in product && product.link && (
                            <a
                              href={product.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-3 mt-0.5"
                              aria-label={`Visit ${product.name}`}
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                      <div className="mt-4">
                        {"link" in product && product.link ? (
                          <span className="text-xs text-muted-foreground/60">
                            {product.link.replace("https://", "")}
                          </span>
                        ) : "status" in product && product.status ? (
                          <span className="inline-flex items-center text-xs font-medium text-muted-foreground/60 bg-muted rounded-full px-2.5 py-0.5">
                            {product.status}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE OPERATE */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            How we operate
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We build companies to stand on their own. Each product has its own identity, audience, and direction. What connects them is a shared approach: clarity over complexity, practicality over theory, and software that holds up when it matters commercially.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-hero-gradient text-white/90">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white/80" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/80">
              BuildStax Group
            </span>
          </div>
          <p className="text-sm text-white/50 mb-8">
            Owner and operator of independent software businesses.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-xs text-white/40 hover:text-white/80 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-white/10">
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} BuildStax Group. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
