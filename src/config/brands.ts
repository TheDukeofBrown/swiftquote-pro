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
    tagline: "Build trust with professional quotes",
    description: "Complete quoting solution for builders & contractors",
    primaryHue: 220, // Slate blue
    accentHue: 210,
    icon: "HardHat",
    features: [
      "Extension calculators",
      "Multi-trade coordination",
      "Project phasing",
    ],
    defaultLabourRate: 45,
    defaultItems: [
      { description: "Day rate (labourer)", unitPrice: 150, itemType: "labour" },
      { description: "Day rate (skilled)", unitPrice: 220, itemType: "labour" },
      { description: "Wall construction (per sq metre)", unitPrice: 120, itemType: "labour" },
      { description: "Foundation work", unitPrice: 2500, itemType: "labour" },
      { description: "Bricks (per 1000)", unitPrice: 450, itemType: "material" },
    ],
  },
};

// Default brand for unauthenticated users or landing page
export const defaultBrand: Omit<BrandConfig, "id"> & { id: null } = {
  id: null,
  name: "QuoteTrack",
  tagline: "Professional quotes for UK tradespeople",
  description: "Create professional quotes in under 60 seconds",
  primaryHue: 220,
  accentHue: 210,
  icon: "FileText",
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
