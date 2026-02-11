
-- ===========================================
-- PHASE 3: SECURITY HARDENING MIGRATION
-- ===========================================

-- A) PUBLIC QUOTE TOKENS TABLE
CREATE TABLE public.quote_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_tokens_token ON public.quote_tokens(token);
CREATE INDEX idx_quote_tokens_quote_id ON public.quote_tokens(quote_id);

ALTER TABLE public.quote_tokens ENABLE ROW LEVEL SECURITY;

-- Service role / edge functions can manage tokens
CREATE POLICY "Users can view tokens for their quotes"
  ON public.quote_tokens FOR SELECT
  USING (quote_id IN (
    SELECT q.id FROM public.quotes q
    JOIN public.companies c ON q.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all tokens"
  ON public.quote_tokens FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage tokens"
  ON public.quote_tokens FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- B) RATE LIMITING TABLE
CREATE TABLE public.rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(key, window_start)
);

CREATE INDEX idx_rate_limit_key ON public.rate_limit_counters(key, window_start);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No public access - only edge functions with service role key

-- C) IMMUTABILITY TRIGGERS - Prevent UPDATE/DELETE on event tables

CREATE OR REPLACE FUNCTION public.prevent_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Modification of immutable audit records is not allowed';
END;
$$;

CREATE TRIGGER prevent_quote_events_update
  BEFORE UPDATE ON public.quote_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE TRIGGER prevent_quote_events_delete
  BEFORE DELETE ON public.quote_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE TRIGGER prevent_email_events_update
  BEFORE UPDATE ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE TRIGGER prevent_email_events_delete
  BEFORE DELETE ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modification();

-- D) ADMIN REGENERATE TOKEN RPC
CREATE OR REPLACE FUNCTION public.admin_regenerate_quote_token(p_quote_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role admin_role;
  v_old_token UUID;
  v_new_token UUID;
  v_new_record RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT role INTO v_admin_role FROM public.admin_users WHERE user_id = auth.uid();
  IF v_admin_role = 'support' THEN
    RAISE EXCEPTION 'Unauthorized: Support role cannot regenerate tokens';
  END IF;

  -- Revoke existing active tokens
  SELECT token INTO v_old_token FROM public.quote_tokens
    WHERE quote_id = p_quote_id AND revoked_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

  UPDATE public.quote_tokens
    SET revoked_at = now()
    WHERE quote_id = p_quote_id AND revoked_at IS NULL;

  -- Create new token
  INSERT INTO public.quote_tokens (quote_id)
    VALUES (p_quote_id)
    RETURNING * INTO v_new_record;

  -- Audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(),
    'regenerate_token',
    'quote',
    p_quote_id,
    jsonb_build_object('old_token', v_old_token),
    jsonb_build_object('new_token', v_new_record.token, 'expires_at', v_new_record.expires_at)
  );

  -- Quote event
  INSERT INTO public.quote_events (company_id, quote_id, event_type, payload)
  SELECT q.company_id, p_quote_id, 'token_regenerated',
    jsonb_build_object('admin_user_id', auth.uid(), 'old_token_revoked', v_old_token IS NOT NULL)
  FROM public.quotes q WHERE q.id = p_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_new_record.token,
    'expires_at', v_new_record.expires_at
  );
END;
$$;

-- E) TENANT ISOLATION VERIFICATION RPC
CREATE OR REPLACE FUNCTION public.admin_verify_tenant_isolation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'quotes_without_company', (SELECT COUNT(*) FROM public.quotes WHERE company_id IS NULL),
    'quote_items_without_quote', (SELECT COUNT(*) FROM public.quote_items WHERE quote_id IS NULL),
    'price_items_without_company', (SELECT COUNT(*) FROM public.price_items WHERE company_id IS NULL),
    'quote_events_without_company', (SELECT COUNT(*) FROM public.quote_events WHERE company_id IS NULL),
    'email_events_without_company', (SELECT COUNT(*) FROM public.email_events WHERE company_id IS NULL),
    'customers_without_company', (SELECT COUNT(*) FROM public.customers WHERE company_id IS NULL),
    'subscriptions_without_company', (SELECT COUNT(*) FROM public.subscriptions WHERE company_id IS NULL),
    'orphan_quote_tokens', (
      SELECT COUNT(*) FROM public.quote_tokens qt
      LEFT JOIN public.quotes q ON q.id = qt.quote_id
      WHERE q.id IS NULL
    ),
    'checked_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- F) IMMUTABILITY CHECK RPC
CREATE OR REPLACE FUNCTION public.admin_check_immutability()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'quote_events', jsonb_build_object(
      'has_update_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_quote_events_update'
        AND event_object_table = 'quote_events'
      ),
      'has_delete_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_quote_events_delete'
        AND event_object_table = 'quote_events'
      )
    ),
    'email_events', jsonb_build_object(
      'has_update_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_email_events_update'
        AND event_object_table = 'email_events'
      ),
      'has_delete_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_email_events_delete'
        AND event_object_table = 'email_events'
      )
    ),
    'admin_audit_log', jsonb_build_object(
      'has_update_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_audit_log_update'
        AND event_object_table = 'admin_audit_log'
      ),
      'has_delete_trigger', EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_audit_log_delete'
        AND event_object_table = 'admin_audit_log'
      )
    ),
    'checked_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;
