
-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.payment_mode AS ENUM ('none', 'booking', 'staged', 'account');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_payment_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stripe_connect_status AS ENUM ('not_connected', 'pending', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_payment_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. quotes table extensions
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_mode public.payment_mode NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER,
  ADD COLUMN IF NOT EXISTS booking_payment_type public.booking_payment_type,
  ADD COLUMN IF NOT EXISTS booking_payment_value NUMERIC,
  ADD COLUMN IF NOT EXISTS booking_payment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS staged_payments JSONB;

-- 3. companies table extensions
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS materials_threshold NUMERIC NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status public.stripe_connect_status NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS bank_sort_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- 4. quote_payments table
CREATE TABLE IF NOT EXISTS public.quote_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stage_label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status public.quote_payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_payments TO authenticated;
GRANT ALL ON public.quote_payments TO service_role;

ALTER TABLE public.quote_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view their quote payments"
  ON public.quote_payments FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Company members can insert their quote payments"
  ON public.quote_payments FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Company members can update their quote payments"
  ON public.quote_payments FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_quote_payments_quote ON public.quote_payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_payments_company ON public.quote_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_payments_session ON public.quote_payments(stripe_checkout_session_id);

CREATE TRIGGER update_quote_payments_updated_at
  BEFORE UPDATE ON public.quote_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
