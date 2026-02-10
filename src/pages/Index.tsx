import { Link } from "react-router-dom";

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
      {/* HERO */}
      <section className="py-32 md:py-44 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            BuildStax Group
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            We build and operate focused software platforms for trades, compliance, and professional workflows.
          </p>
          <p className="text-sm text-muted-foreground/70 italic">
            Simple in the field. Useful in the office. Defensible when it matters.
          </p>
        </div>
      </section>

      {/* WHAT WE BUILD */}
      <section className="py-24 md:py-32 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-16">
            What we build
          </h2>
          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            {lanes.map((lane) => (
              <div key={lane.title}>
                <h3 className="font-semibold text-base mb-3">{lane.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lane.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="py-24 md:py-32 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-16">
            Portfolio
          </h2>
          <div className="space-y-16">
            {Object.entries(portfolio).map(([lane, products]) => (
              <div key={lane}>
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
                  {lane}
                </h3>
                <div className="space-y-6">
                  {products.map((product) => (
                    <div
                      key={product.name}
                      className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
                    >
                      <span className="font-semibold text-base shrink-0">
                        {product.name}
                      </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {product.description}
                      </span>
                      {"link" in product && product.link ? (
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                        >
                          {product.link.replace("https://", "")}
                        </a>
                      ) : "status" in product && product.status ? (
                        <span className="text-xs text-muted-foreground/50 italic shrink-0">
                          {product.status}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE OPERATE */}
      <section className="py-24 md:py-32 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">
            How we operate
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            We build companies to stand on their own. Each product has its own identity, audience, and direction. What connects them is a shared approach: clarity over complexity, practicality over theory, and software that holds up when it matters commercially.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground mb-8">
            BuildStax Group — Owner and operator of independent software businesses.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
