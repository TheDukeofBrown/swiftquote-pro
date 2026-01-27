import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useCompany } from "./CompanyContext";
import { getBrandByTrade, BrandConfig, defaultBrand, brands } from "@/config/brands";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];

const STORAGE_KEY = "selectedBrandId";

interface BrandContextType {
  brand: BrandConfig | typeof defaultBrand;
  isTradeSpecific: boolean;
  selectBrand: (tradeId: TradeType) => void;
  clearManualBrand: () => void;
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

function getStoredBrandId(): TradeType | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "plumber" || stored === "electrician" || stored === "plasterer" || stored === "builder")) {
      return stored as TradeType;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

function setStoredBrandId(tradeId: TradeType | null) {
  try {
    if (tradeId) {
      localStorage.setItem(STORAGE_KEY, tradeId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage not available
  }
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { company } = useCompany();
  const [manualBrandId, setManualBrandId] = useState<TradeType | null>(() => getStoredBrandId());
  
  // Company trade takes precedence over manual selection
  const trade = company?.trade as TradeType | null;
  const effectiveTrade = trade || manualBrandId;
  
  // Safely get brand with fallback to defaultBrand
  const brand = effectiveTrade && brands[effectiveTrade] ? brands[effectiveTrade] : defaultBrand;
  const isTradeSpecific = brand.id !== null;

  const selectBrand = (tradeId: TradeType) => {
    setManualBrandId(tradeId);
    setStoredBrandId(tradeId);
  };

  const clearManualBrand = () => {
    setManualBrandId(null);
    setStoredBrandId(null);
  };

  // Clear manual brand when user has a company (their real trade takes over)
  useEffect(() => {
    if (company?.trade) {
      clearManualBrand();
    }
  }, [company?.trade]);

  useEffect(() => {
    applyBrandTheme(brand.primaryHue, brand.accentHue);
  }, [brand.primaryHue, brand.accentHue]);

  return (
    <BrandContext.Provider value={{ brand, isTradeSpecific, selectBrand, clearManualBrand }}>
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
