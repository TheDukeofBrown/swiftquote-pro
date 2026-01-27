import quoteBuilderScreenshot from "@/assets/screenshots/quote-builder.png";

interface PhoneMockupProps {
  accentColor?: string;
}

export default function PhoneMockup({ accentColor }: PhoneMockupProps) {
  return (
    <div className="relative">
      {/* Phone frame */}
      <div 
        className="relative mx-auto w-[280px] md:w-[300px] h-[560px] md:h-[600px] rounded-[3rem] p-2 shadow-2xl"
        style={{ 
          backgroundColor: accentColor ? `hsl(${accentColor} 30% 15%)` : '#1e293b'
        }}
      >
        {/* Screen */}
        <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10"></div>
          
          {/* Screenshot */}
          <img 
            src={quoteBuilderScreenshot} 
            alt="WorkQuote quote builder interface"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>

      {/* Accent glow */}
      <div 
        className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-30"
        style={{ 
          backgroundColor: accentColor ? `hsl(${accentColor} 70% 50%)` : 'hsl(220 70% 50%)'
        }}
      ></div>
      <div 
        className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ 
          backgroundColor: accentColor ? `hsl(${accentColor} 70% 50%)` : 'hsl(220 70% 50%)'
        }}
      ></div>
    </div>
  );
}
