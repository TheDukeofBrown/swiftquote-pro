import { createContext, useContext, useEffect, ReactNode } from "react";
import { useCompany } from "./CompanyContext";
import { getBrandByTrade, BrandConfig, defaultBrand } from "@/config/brands";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];

interface BrandContextType {
  brand: BrandConfig | typeof defaultBrand;
  isTradeSpecific: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

function applyBrandTheme(primaryHue: number, accentHue: number) {
  const root = document.documentElement;
  
  // Apply brand-specific hues to CSS custom properties
  root.style.setProperty("--brand-primary-hue", String(primaryHue));
  root.style.setProperty("--brand-accent-hue", String(accentHue));
  
  // Update primary color with the brand hue
  root.style.setProperty("--primary", `${primaryHue} 70% 45%`);
  root.style.setProperty("--primary-foreground", `${primaryHue} 10% 98%`);
  
  // Update ring color
  root.style.setProperty("--ring", `${primaryHue} 70% 45%`);
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { company } = useCompany();
  
  const trade = company?.trade as TradeType | null;
  const brand = getBrandByTrade(trade);
  const isTradeSpecific = brand.id !== null;

  useEffect(() => {
    applyBrandTheme(brand.primaryHue, brand.accentHue);
  }, [brand.primaryHue, brand.accentHue]);

  return (
    <BrandContext.Provider value={{ brand, isTradeSpecific }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
