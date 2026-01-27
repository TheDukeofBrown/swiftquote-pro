import { FileEdit, Send, CheckCircle } from "lucide-react";
import quoteBuilderScreenshot from "@/assets/screenshots/quote-builder.png";
import sendQuoteScreenshot from "@/assets/screenshots/send-quote.png";
import dashboardScreenshot from "@/assets/screenshots/dashboard.png";

interface FeatureScreenshotStripProps {
  tradeName?: string;
}

const steps = [
  {
    icon: FileEdit,
    title: "Build your quote",
    screenshot: quoteBuilderScreenshot,
    alt: "Quote builder interface",
  },
  {
    icon: Send,
    title: "Send to customer",
    screenshot: sendQuoteScreenshot,
    alt: "Send quote interface",
  },
  {
    icon: CheckCircle,
    title: "Get accepted",
    screenshot: dashboardScreenshot,
    alt: "Dashboard showing accepted quote",
  },
];

export default function FeatureScreenshotStrip({ tradeName = "trades" }: FeatureScreenshotStripProps) {
  const captions = [
    `Add items from your price library in seconds.`,
    `Email a professional PDF quote instantly.`,
    `Track when it's viewed and accepted.`,
  ];

  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">From quote to accepted — in minutes</h2>
          <p className="text-muted-foreground">
            Built for {tradeName} who need to quote fast and look professional.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.title} className="text-center group">
              {/* Phone frame with screenshot */}
              <div className="relative mx-auto w-[180px] h-[320px] bg-slate-900 rounded-[1.5rem] p-1.5 shadow-xl mb-6 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-white rounded-[1.25rem] overflow-hidden">
                  <img 
                    src={step.screenshot} 
                    alt={step.alt}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {index + 1}
                </div>
              </div>
              
              {/* Icon and text */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <step.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{captions[index]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
