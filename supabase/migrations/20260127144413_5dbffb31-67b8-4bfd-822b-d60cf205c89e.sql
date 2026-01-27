-- Create item unit type enum
CREATE TYPE public.price_item_unit AS ENUM ('each', 'hour', 'percent', 'metre', 'day');

-- Create item category type enum  
CREATE TYPE public.price_item_type AS ENUM ('labour', 'material', 'service', 'uplift');

-- Create price_items table for company-scoped price library
CREATE TABLE public.price_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.price_item_type NOT NULL DEFAULT 'labour',
  name TEXT NOT NULL,
  description TEXT,
  unit public.price_item_unit NOT NULL DEFAULT 'each',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_items
CREATE POLICY "Users can view their company price items"
ON public.price_items FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create price items for their company"
ON public.price_items FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their company price items"
ON public.price_items FOR UPDATE
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete their company price items"
ON public.price_items FOR DELETE
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_price_items_updated_at
BEFORE UPDATE ON public.price_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_price_items_company_id ON public.price_items(company_id);
CREATE INDEX idx_price_items_type ON public.price_items(type);