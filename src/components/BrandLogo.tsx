import { forwardRef } from "react";
import { FileText, Droplets, Zap, PaintBucket, HardHat, Paintbrush, Home } from "lucide-react";
import { useBrand } from "@/contexts/BrandContext";
import { platformBrand } from "@/config/brands";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showPlatform?: boolean;
  className?: string;
}

const iconMap = {
  FileText,
  Droplets,
  Zap,
  PaintBucket,
  HardHat,
  Paintbrush,
  Home,
};

const sizeClasses = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-lg", platform: "text-xs" },
  md: { container: "w-9 h-9", icon: "w-5 h-5", text: "text-xl", platform: "text-xs" },
  lg: { container: "w-10 h-10", icon: "w-6 h-6", text: "text-2xl", platform: "text-sm" },
};

const BrandLogo = forwardRef<HTMLDivElement, BrandLogoProps>(
  ({ size = "md", showText = true, showPlatform = true, className }, ref) => {
    const { brand, isTradeSpecific } = useBrand();
    
    const Icon = iconMap[brand.icon as keyof typeof iconMap] || Zap;
    const sizes = sizeClasses[size];

    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-lg bg-primary flex items-center justify-center",
          sizes.container
        )}>
          <Icon className={cn("text-primary-foreground", sizes.icon)} />
        </div>
        {showText && (
          <div className="flex flex-col">
            {showPlatform && isTradeSpecific && (
              <span className={cn("text-muted-foreground leading-tight", sizes.platform)}>
                {platformBrand.name}
              </span>
            )}
            <span className={cn("font-bold text-foreground leading-tight", sizes.text)}>
              {brand.name}
            </span>
          </div>
        )}
      </div>
    );
  }
);

BrandLogo.displayName = "BrandLogo";

export default BrandLogo;
