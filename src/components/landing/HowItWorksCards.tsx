import { Users, FileEdit, Send } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Choose your trade",
    description: "Pick your trade and get pricing defaults that match how you work.",
  },
  {
    icon: FileEdit,
    title: "Build your quote",
    description: "Add items from your price library. Adjust quantities. Done in seconds.",
  },
  {
    icon: Send,
    title: "Send & get accepted",
    description: "Email a professional PDF. Track when it's viewed and accepted.",
  },
];

export default function HowItWorksCards() {
  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground">Three steps. That's it.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={step.title} 
              className="relative bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all"
            >
              {/* Step number */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {index + 1}
              </div>
              
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 mt-2">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
