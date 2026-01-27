import { forwardRef } from "react";
import { FileText, Droplets, Zap, PaintBucket, HardHat, Paintbrush, Home } from "lucide-react";
import { useBrand } from "@/contexts/BrandContext";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
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
  sm: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-lg" },
  md: { container: "w-9 h-9", icon: "w-5 h-5", text: "text-xl" },
  lg: { container: "w-10 h-10", icon: "w-6 h-6", text: "text-2xl" },
};

const BrandLogo = forwardRef<HTMLDivElement, BrandLogoProps>(
  ({ size = "md", showText = true, className }, ref) => {
    const { brand } = useBrand();
    
    const Icon = iconMap[brand.icon as keyof typeof iconMap] || FileText;
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
          <span className={cn("font-bold text-foreground", sizes.text)}>
            {brand.name}
          </span>
        )}
      </div>
    );
  }
);

BrandLogo.displayName = "BrandLogo";

export default BrandLogo;
