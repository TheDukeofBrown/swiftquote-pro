-- Create enum for trade types
CREATE TYPE public.trade_type AS ENUM ('builder', 'plumber', 'electrician', 'plasterer');

-- Create enum for quote status
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined');

-- Create companies table (one per user)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  default_labour_rate DECIMAL(10,2) DEFAULT 45.00,
  vat_registered BOOLEAN DEFAULT false,
  vat_rate DECIMAL(5,2) DEFAULT 20.00,
  trade trade_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  reference TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  job_address TEXT,
  status quote_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  valid_until DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'labour', -- 'labour' or 'materials'
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  markup_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for customers (through company ownership)
CREATE POLICY "Users can view their company customers"
  ON public.customers FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create customers for their company"
  ON public.customers FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company customers"
  ON public.customers FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company customers"
  ON public.customers FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- RLS Policies for quotes
CREATE POLICY "Users can view their company quotes"
  ON public.quotes FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create quotes for their company"
  ON public.quotes FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company quotes"
  ON public.quotes FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company quotes"
  ON public.quotes FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- RLS Policies for quote_items (through quote -> company ownership)
CREATE POLICY "Users can view their quote items"
  ON public.quote_items FOR SELECT
  USING (quote_id IN (
    SELECT q.id FROM public.quotes q 
    JOIN public.companies c ON q.company_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create quote items"
  ON public.quote_items FOR INSERT
  WITH CHECK (quote_id IN (
    SELECT q.id FROM public.quotes q 
    JOIN public.companies c ON q.company_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their quote items"
  ON public.quote_items FOR UPDATE
  USING (quote_id IN (
    SELECT q.id FROM public.quotes q 
    JOIN public.companies c ON q.company_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their quote items"
  ON public.quote_items FOR DELETE
  USING (quote_id IN (
    SELECT q.id FROM public.quotes q 
    JOIN public.companies c ON q.company_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate quote reference
CREATE OR REPLACE FUNCTION public.generate_quote_reference()
RETURNS TRIGGER AS $$
DECLARE
  company_prefix TEXT;
  quote_count INTEGER;
BEGIN
  -- Get first 3 letters of company name
  SELECT UPPER(LEFT(REGEXP_REPLACE(business_name, '[^a-zA-Z]', '', 'g'), 3))
  INTO company_prefix
  FROM public.companies
  WHERE id = NEW.company_id;
  
  -- Count existing quotes for this company
  SELECT COUNT(*) + 1
  INTO quote_count
  FROM public.quotes
  WHERE company_id = NEW.company_id;
  
  -- Generate reference like ABC-0001
  NEW.reference := COALESCE(company_prefix, 'QTE') || '-' || LPAD(quote_count::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for auto-generating quote reference
CREATE TRIGGER generate_quote_reference_trigger
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.reference IS NULL OR NEW.reference = '')
  EXECUTE FUNCTION public.generate_quote_reference();