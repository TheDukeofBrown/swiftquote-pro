
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_flags TO authenticated;
GRANT ALL ON public.company_flags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_items TO authenticated;
GRANT ALL ON public.price_items TO service_role;

GRANT SELECT ON public.quote_events TO authenticated;
GRANT ALL ON public.quote_events TO service_role;

GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;

GRANT SELECT ON public.quote_tokens TO authenticated;
GRANT ALL ON public.quote_tokens TO service_role;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

GRANT SELECT ON public.usage_records TO authenticated;
GRANT ALL ON public.usage_records TO service_role;

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

GRANT ALL ON public.rate_limit_counters TO service_role;
