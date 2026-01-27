import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];

export interface BrandConfig {
  id: TradeType;
  name: string;
  tagline: string;
  description: string;
  primaryHue: number;
  accentHue: number;
  icon: string; // Lucide icon name
  features: string[];
  defaultLabourRate: number;
  defaultItems: {
    description: string;
    unitPrice: number;
    itemType: "labour" | "material";
  }[];
}

export const brands: Record<TradeType, BrandConfig> = {
  plumber: {
    id: "plumber",
    name: "PlumbQuote",
    tagline: "Professional plumbing quotes in seconds",
    description: "The fast, professional way for plumbers to quote jobs",
    primaryHue: 200, // Blue
    accentHue: 190,
    icon: "Droplets",
    features: [
      "Bathroom & kitchen templates",
      "Heating system quotes",
      "Emergency call-out pricing",
    ],
    defaultLabourRate: 55,
    defaultItems: [
      { description: "Bathroom installation", unitPrice: 1200, itemType: "labour" },
      { description: "Boiler service", unitPrice: 120, itemType: "labour" },
      { description: "Radiator installation", unitPrice: 180, itemType: "labour" },
      { description: "Tap replacement", unitPrice: 85, itemType: "labour" },
      { description: "Copper pipe (per metre)", unitPrice: 12, itemType: "material" },
    ],
  },
  electrician: {
    id: "electrician",
    name: "SparkQuote",
    tagline: "Professional electrical quotes in under 60 seconds",
    description: "Built for busy electricians who need professional quotes on the go",
    primaryHue: 220, // Navy / Electric blue
    accentHue: 45, // Yellow accent
    icon: "Zap",
    features: [
      "Installations & rewiring",
      "Testing & certification",
      "Compliance documentation",
    ],
    defaultLabourRate: 50,
    defaultItems: [
      { description: "Consumer unit upgrade", unitPrice: 450, itemType: "labour" },
      { description: "Full house rewire", unitPrice: 3500, itemType: "labour" },
      { description: "Socket installation", unitPrice: 85, itemType: "labour" },
      { description: "Light fitting installation", unitPrice: 65, itemType: "labour" },
      { description: "Cable (per metre)", unitPrice: 3, itemType: "material" },
    ],
  },
  plasterer: {
    id: "plasterer",
    name: "PlasterQuote",
    tagline: "Clear, simple plastering quotes in under 60 seconds",
    description: "Built for busy plasterers who'd rather be on-site than doing paperwork",
    primaryHue: 240, // Neutral grey / slate
    accentHue: 220, // Soft blue-grey
    icon: "PaintBucket",
    features: [
      "Room skims & day rates",
      "Clean, simple pricing",
      "No jargon, just quotes",
    ],
    defaultLabourRate: 40,
    defaultItems: [
      { description: "Day rate", unitPrice: 200, itemType: "labour" },
      { description: "Room skim (walls)", unitPrice: 280, itemType: "labour" },
      { description: "Ceiling skim", unitPrice: 180, itemType: "labour" },
      { description: "Patch repair", unitPrice: 85, itemType: "labour" },
      { description: "Materials allowance", unitPrice: 50, itemType: "material" },
    ],
  },
  builder: {
    id: "builder",
    name: "BuildQuote",
    tagline: "Professional building quotes in under 60 seconds",
    description: "Built for busy builders who want less admin and more building",
    primaryHue: 215, // Slate / charcoal
    accentHue: 25, // Orange accent (subtle)
    icon: "HardHat",
    features: [
      "Multi-line quotes without spreadsheets",
      "Section grouping for large jobs",
      "Clean, professional PDFs",
    ],
    defaultLabourRate: 45,
    defaultItems: [
      { description: "Day rate (labourer)", unitPrice: 150, itemType: "labour" },
      { description: "Day rate (skilled)", unitPrice: 220, itemType: "labour" },
      { description: "Site setup / prelims", unitPrice: 500, itemType: "labour" },
      { description: "Demolition / strip out", unitPrice: 800, itemType: "labour" },
      { description: "Groundworks allowance", unitPrice: 2500, itemType: "material" },
      { description: "Materials allowance", unitPrice: 1000, itemType: "material" },
      { description: "Waste / skip allowance", unitPrice: 350, itemType: "material" },
    ],
  },
  painter: {
    id: "painter",
    name: "PaintQuote",
    tagline: "Fast, professional decorating quotes in under 60 seconds",
    description: "Built for painters & decorators who want to quote fast and look professional",
    primaryHue: 160, // Deep green
    accentHue: 45, // Cream/warm neutral
    icon: "Paintbrush",
    features: [
      "Room quotes in seconds",
      "Prep & materials included",
      "Professional PDF output",
    ],
    defaultLabourRate: 35,
    defaultItems: [
      { description: "Day rate", unitPrice: 180, itemType: "labour" },
      { description: "Room paint (walls)", unitPrice: 200, itemType: "labour" },
      { description: "Ceiling paint", unitPrice: 120, itemType: "labour" },
      { description: "Woodwork (skirting/doors)", unitPrice: 150, itemType: "labour" },
      { description: "Prep & filling allowance", unitPrice: 80, itemType: "material" },
      { description: "Materials allowance", unitPrice: 100, itemType: "material" },
    ],
  },
  roofer: {
    id: "roofer",
    name: "RoofQuote",
    tagline: "Send roofing quotes fast — without paperwork",
    description: "Built for roofers who want to quote jobs quickly and win more work",
    primaryHue: 220, // Dark grey/slate
    accentHue: 50, // Safety yellow (subtle)
    icon: "Home",
    features: [
      "Quick repair quotes",
      "Scaffolding included",
      "Clean, professional PDFs",
    ],
    defaultLabourRate: 50,
    defaultItems: [
      { description: "Labour day rate", unitPrice: 220, itemType: "labour" },
      { description: "Call-out / inspection", unitPrice: 75, itemType: "labour" },
      { description: "Roof repair allowance", unitPrice: 350, itemType: "labour" },
      { description: "Replacement tiles/slates", unitPrice: 200, itemType: "material" },
      { description: "Leadwork / flashing", unitPrice: 400, itemType: "material" },
      { description: "Scaffolding allowance", unitPrice: 600, itemType: "material" },
    ],
  },
};

// Platform brand - SwiftQuote is the master brand
export const platformBrand = {
  name: "SwiftQuote",
  tagline: "Professional Quotes in Under 60 Seconds",
  description: "The quoting platform built for UK tradespeople",
};

// Default brand for unauthenticated users or landing page
export const defaultBrand: Omit<BrandConfig, "id"> & { id: null } = {
  id: null,
  name: "SwiftQuote",
  tagline: "Professional Quotes in Under 60 Seconds",
  description: "The quoting platform built for UK tradespeople",
  primaryHue: 220,
  accentHue: 210,
  icon: "Zap",
  features: [
    "60-second quote creation",
    "Professional PDF output",
    "Customer tracking",
  ],
  defaultLabourRate: 45,
  defaultItems: [],
};

export function getBrandByTrade(trade: TradeType | null): BrandConfig | typeof defaultBrand {
  if (!trade) return defaultBrand;
  return brands[trade] || defaultBrand;
}
