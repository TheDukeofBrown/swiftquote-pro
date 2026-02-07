-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'support');

-- Admin users table (separate from profiles per security guidelines)
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Company flags table for operational controls
CREATE TABLE public.company_flags (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  lock_reason TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote events table (immutable timeline)
CREATE TABLE public.quote_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'pdf_generated', 'email_sent', 'email_failed', 'viewed', 'accepted', 'declined', 'status_changed')),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email events table (immutable timeline)
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin audit log (immutable)
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id
  )
$$;

-- Security definer function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users
  WHERE user_id = _user_id
$$;

-- Security definer function to check if company is locked
CREATE OR REPLACE FUNCTION public.is_company_locked(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_locked FROM public.company_flags WHERE company_id = _company_id),
    false
  )
$$;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin users"
ON public.admin_users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
ON public.admin_users FOR ALL
TO authenticated
USING (public.get_admin_role(auth.uid()) = 'super_admin')
WITH CHECK (public.get_admin_role(auth.uid()) = 'super_admin');

-- RLS Policies for company_flags
CREATE POLICY "Admins can view company flags"
ON public.company_flags FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage company flags"
ON public.company_flags FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Users can check their own company lock status
CREATE POLICY "Users can view their company flags"
ON public.company_flags FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- RLS Policies for quote_events
CREATE POLICY "Admins can view all quote events"
ON public.quote_events FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert quote events"
ON public.quote_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their quote events"
ON public.quote_events FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- RLS Policies for email_events
CREATE POLICY "Admins can view all email events"
ON public.email_events FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert email events"
ON public.email_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their email events"
ON public.email_events FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- RLS Policies for admin_audit_log
CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit log"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_quote_events_company ON public.quote_events(company_id);
CREATE INDEX idx_quote_events_quote ON public.quote_events(quote_id);
CREATE INDEX idx_quote_events_type ON public.quote_events(event_type);
CREATE INDEX idx_quote_events_created ON public.quote_events(created_at DESC);

CREATE INDEX idx_email_events_company ON public.email_events(company_id);
CREATE INDEX idx_email_events_quote ON public.email_events(quote_id);
CREATE INDEX idx_email_events_status ON public.email_events(status);
CREATE INDEX idx_email_events_created ON public.email_events(created_at DESC);

CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_entity ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Update quotes RLS to block locked companies from creating/updating
CREATE OR REPLACE FUNCTION public.can_modify_quotes(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE(
    (SELECT is_locked FROM public.company_flags WHERE company_id = _company_id),
    false
  )
$$;

-- Drop existing insert policy and create new one with lock check
DROP POLICY IF EXISTS "Users can create quotes for their company" ON public.quotes;
CREATE POLICY "Users can create quotes for their company"
ON public.quotes FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  AND public.can_modify_quotes(company_id)
);

-- Update existing update policy to include lock check
DROP POLICY IF EXISTS "Users can update their company quotes" ON public.quotes;
CREATE POLICY "Users can update their company quotes"
ON public.quotes FOR UPDATE
TO authenticated
USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  AND public.can_modify_quotes(company_id)
);

-- Trigger to update updated_at on admin_users
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on company_flags
CREATE TRIGGER update_company_flags_updated_at
BEFORE UPDATE ON public.company_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();