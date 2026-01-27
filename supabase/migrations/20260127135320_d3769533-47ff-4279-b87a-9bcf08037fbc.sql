-- Create subscription plan enum
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'business');

-- Create subscription status enum  
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trialing',
  
  -- Stripe integration (prepared for future)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Plan dates
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days'),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Usage metrics
  quotes_created_this_month INTEGER NOT NULL DEFAULT 0,
  quotes_sent_this_month INTEGER NOT NULL DEFAULT 0,
  pdfs_generated_this_month INTEGER NOT NULL DEFAULT 0,
  
  -- Reset tracking
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, period_start)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions (users can only view/update their own company's subscription)
CREATE POLICY "Users can view their company subscription"
ON public.subscriptions
FOR SELECT
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company subscription"
ON public.subscriptions
FOR UPDATE
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS policies for usage records
CREATE POLICY "Users can view their company usage"
ON public.usage_records
FOR SELECT
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company usage"
ON public.usage_records
FOR UPDATE
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Create trigger for updating subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating usage_records updated_at
CREATE TRIGGER update_usage_records_updated_at
BEFORE UPDATE ON public.usage_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create subscription and usage when company is created
CREATE OR REPLACE FUNCTION public.create_company_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create subscription for new company
  INSERT INTO public.subscriptions (company_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'free', 'trialing', now() + INTERVAL '14 days');
  
  -- Create usage record for current month
  INSERT INTO public.usage_records (company_id, period_start)
  VALUES (NEW.id, date_trunc('month', now())::date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create subscription when company is created
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.create_company_subscription();

-- Function to increment usage (called from edge functions)
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_company_id UUID,
  p_metric TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period DATE := date_trunc('month', now())::date;
BEGIN
  -- Upsert usage record for current month
  INSERT INTO public.usage_records (company_id, period_start)
  VALUES (p_company_id, current_period)
  ON CONFLICT (company_id, period_start) DO NOTHING;
  
  -- Increment the specified metric
  IF p_metric = 'quotes_created' THEN
    UPDATE public.usage_records
    SET quotes_created_this_month = quotes_created_this_month + 1
    WHERE company_id = p_company_id AND period_start = current_period;
  ELSIF p_metric = 'quotes_sent' THEN
    UPDATE public.usage_records
    SET quotes_sent_this_month = quotes_sent_this_month + 1
    WHERE company_id = p_company_id AND period_start = current_period;
  ELSIF p_metric = 'pdfs_generated' THEN
    UPDATE public.usage_records
    SET pdfs_generated_this_month = pdfs_generated_this_month + 1
    WHERE company_id = p_company_id AND period_start = current_period;
  ELSE
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;