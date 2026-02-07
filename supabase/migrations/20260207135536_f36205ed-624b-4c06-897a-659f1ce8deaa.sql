-- Fix the overly permissive INSERT policies by making them security definer functions
-- These tables need to allow inserts from edge functions (service role)

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert quote events" ON public.quote_events;
DROP POLICY IF EXISTS "System can insert email events" ON public.email_events;
DROP POLICY IF EXISTS "System can insert audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can insert usage records" ON public.usage_records;

-- Create more restrictive policies - only allow if the user owns the company or is admin
CREATE POLICY "Users can insert their quote events"
ON public.quote_events FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can insert their email events"
ON public.email_events FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can insert audit log"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Fix subscriptions and usage_records policies
CREATE POLICY "Users can insert their subscriptions"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their usage records"
ON public.usage_records FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);