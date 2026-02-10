import { Building2, ArrowUpRight, Layers, Settings, Shield, Workflow } from "lucide-react";

// Hero mobile mockups
import mockupWorkquote from "@/assets/mockup-workquote.png";
import mockupPayready from "@/assets/mockup-payready.png";
import mockupFiredoor from "@/assets/mockup-firedoor.png";
import mockupApplyready from "@/assets/mockup-applyready.png";

// Desktop system screenshots
import systemWorkquote from "@/assets/system-workquote.png";
import systemPayready from "@/assets/system-payready.png";
import systemFiredoor from "@/assets/system-firedoor.png";
import systemApplyready from "@/assets/system-applyready.png";

const systems = [
  {
    name: "WorkQuote",
    label: "Quoting & pricing systems",
    image: systemWorkquote,
    link: "https://workquote.co.uk",
  },
  {
    name: "PayReady",
    label: "Payment & valuation workflows",
    image: systemPayready,
    link: "https://payready.co.uk",
  },
  {
    name: "FireDoor Inspection Pro™",
    label: "Compliance & inspection platforms",
    image: systemFiredoor,
  },
  {
    name: "ApplyReady",
    label: "Professional & hiring tools",
    image: systemApplyready,
    link: "https://applyready.co.uk",
  },
];

const capabilities = [
  {
    icon: Layers,
    title: "Build and operate software platforms",
    description: "End-to-end ownership — from architecture to daily operations.",
  },
  {
    icon: Workflow,
    title: "Automate admin-heavy operations",
    description: "Replacing manual processes with structured, digital workflows.",
  },
  {
    icon: Settings,
    title: "Integrate systems and workflows",
    description: "Connecting pricing, payments, compliance, and reporting.",
  },
];

const strengths = [
  "Built for real workflows",
  "Mobile-first and field-tested",
  "Designed to integrate",
  "Operated long-term",
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
    <div className="min-h-screen bg-card text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
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
      <section className="relative bg-hero-gradient overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/[0.02]" />
          <div className="absolute bottom-0 left-10 w-72 h-72 rounded-full bg-white/[0.015]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                Software platforms for&nbsp;the&nbsp;real&nbsp;world.
              </h1>
              <p className="text-base md:text-lg text-white/75 leading-relaxed mb-6 max-w-lg">
                We design and build operational software for trades, compliance, and commercial teams.
              </p>
              <p className="text-sm text-white/40 tracking-wide font-medium">
                Quoting · Payments · Inspections · Compliance · Automation
              </p>
            </div>

            {/* Right — phone montage */}
            <div className="relative h-[340px] md:h-[420px] lg:h-[480px] flex items-center justify-center">
              {[
                { src: mockupWorkquote, alt: "WorkQuote", style: "left-[0%] top-[8%] rotate-[-4deg] z-10" },
                { src: mockupPayready, alt: "PayReady", style: "left-[20%] top-[0%] rotate-[1deg] z-20" },
                { src: mockupFiredoor, alt: "FireDoor Inspection Pro", style: "left-[42%] top-[6%] rotate-[4deg] z-30" },
                { src: mockupApplyready, alt: "ApplyReady", style: "left-[62%] top-[2%] rotate-[-2deg] z-40" },
              ].map((phone) => (
                <img
                  key={phone.alt}
                  src={phone.src}
                  alt={phone.alt}
                  className={`absolute w-[140px] md:w-[160px] lg:w-[180px] rounded-2xl shadow-2xl shadow-black/40 border border-white/10 ${phone.style}`}
                  loading="eager"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SYSTEMS WE BUILD */}
      <section className="py-20 md:py-28 px-6 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Systems we build and operate
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Each platform serves a defined market with purpose-built software.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {systems.map((system) => (
              <div
                key={system.name}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-[16/10] bg-muted/60 overflow-hidden">
                  <img
                    src={system.image}
                    alt={`${system.name} platform`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base text-foreground mb-1">{system.name}</h3>
                    <p className="text-sm text-muted-foreground">{system.label}</p>
                  </div>
                  {"link" in system && system.link && (
                    <a
                      href={system.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                      aria-label={`Visit ${system.name}`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT BUILDSTAX DOES */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            What BuildStax does
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl">
            Capability, not services.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="bg-card border border-border rounded-xl p-7"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                  <cap.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base text-foreground mb-2">{cap.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY BUILDSTAX */}
      <section className="py-20 md:py-28 px-6 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10">
            Why BuildStax
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {strengths.map((s) => (
              <div
                key={s}
                className="bg-card border border-border rounded-xl px-6 py-5 flex items-center"
              >
                <Shield className="w-4 h-4 text-primary shrink-0 mr-3" />
                <span className="text-sm font-medium text-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE GROUP */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
            The BuildStax Group
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            BuildStax Group operates multiple independent software platforms serving trade, compliance, and professional markets.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-hero-gradient text-white/90">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white/80" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/80">
              BuildStax Group
            </span>
          </div>
          <p className="text-sm text-white/50 mb-8">
            Designing, building, and operating software that works.
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
