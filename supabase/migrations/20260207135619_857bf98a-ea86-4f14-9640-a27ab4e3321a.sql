-- Admin RPC Functions with proper security

-- Lock a company (admin only)
CREATE OR REPLACE FUNCTION public.admin_lock_company(
  p_company_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get before state
  SELECT to_jsonb(cf.*) INTO v_before
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Upsert company flags
  INSERT INTO public.company_flags (company_id, is_locked, lock_reason)
  VALUES (p_company_id, true, p_reason)
  ON CONFLICT (company_id)
  DO UPDATE SET is_locked = true, lock_reason = p_reason, updated_at = now();

  -- Get after state
  SELECT to_jsonb(cf.*) INTO v_after
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Write audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (auth.uid(), 'lock_company', 'company', p_company_id, v_before, v_after);

  RETURN TRUE;
END;
$$;

-- Unlock a company (admin only)
CREATE OR REPLACE FUNCTION public.admin_unlock_company(
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get before state
  SELECT to_jsonb(cf.*) INTO v_before
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Update company flags
  UPDATE public.company_flags
  SET is_locked = false, lock_reason = NULL, updated_at = now()
  WHERE company_id = p_company_id;

  -- Get after state
  SELECT to_jsonb(cf.*) INTO v_after
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Write audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (auth.uid(), 'unlock_company', 'company', p_company_id, v_before, v_after);

  RETURN TRUE;
END;
$$;

-- Set company notes (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_company_note(
  p_company_id UUID,
  p_note TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get before state
  SELECT to_jsonb(cf.*) INTO v_before
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Upsert company flags
  INSERT INTO public.company_flags (company_id, notes)
  VALUES (p_company_id, p_note)
  ON CONFLICT (company_id)
  DO UPDATE SET notes = p_note, updated_at = now();

  -- Get after state
  SELECT to_jsonb(cf.*) INTO v_after
  FROM public.company_flags cf
  WHERE cf.company_id = p_company_id;

  -- Write audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (auth.uid(), 'set_company_note', 'company', p_company_id, v_before, v_after);

  RETURN TRUE;
END;
$$;

-- Get admin metrics (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_metrics(
  p_date_from TIMESTAMP WITH TIME ZONE,
  p_date_to TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'quotes_created', (SELECT COUNT(*) FROM public.quotes WHERE created_at BETWEEN p_date_from AND p_date_to),
    'quotes_sent', (SELECT COUNT(*) FROM public.quotes WHERE sent_at BETWEEN p_date_from AND p_date_to),
    'quotes_viewed', (SELECT COUNT(*) FROM public.quotes WHERE viewed_at BETWEEN p_date_from AND p_date_to),
    'quotes_accepted', (SELECT COUNT(*) FROM public.quotes WHERE accepted_at BETWEEN p_date_from AND p_date_to),
    'quotes_declined', (SELECT COUNT(*) FROM public.quotes WHERE declined_at BETWEEN p_date_from AND p_date_to),
    'email_sent', (SELECT COUNT(*) FROM public.email_events WHERE status = 'sent' AND created_at BETWEEN p_date_from AND p_date_to),
    'email_failed', (SELECT COUNT(*) FROM public.email_events WHERE status = 'failed' AND created_at BETWEEN p_date_from AND p_date_to),
    'active_companies', (SELECT COUNT(*) FROM public.companies WHERE created_at <= p_date_to),
    'trialing_companies', (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'trialing' AND created_at <= p_date_to),
    'total_quote_value', (SELECT COALESCE(SUM(total), 0) FROM public.quotes WHERE created_at BETWEEN p_date_from AND p_date_to),
    'accepted_quote_value', (SELECT COALESCE(SUM(total), 0) FROM public.quotes WHERE accepted_at BETWEEN p_date_from AND p_date_to)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get all companies for admin view
CREATE OR REPLACE FUNCTION public.admin_get_companies()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  trade TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_locked BOOLEAN,
  lock_reason TEXT,
  notes TEXT,
  quotes_sent_30d BIGINT,
  quotes_accepted_30d BIGINT,
  email_failure_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.business_name,
    c.trade::TEXT,
    c.email,
    c.phone,
    c.created_at,
    COALESCE(cf.is_locked, false) AS is_locked,
    cf.lock_reason,
    cf.notes,
    (SELECT COUNT(*) FROM public.quotes q WHERE q.company_id = c.id AND q.sent_at >= now() - INTERVAL '30 days') AS quotes_sent_30d,
    (SELECT COUNT(*) FROM public.quotes q WHERE q.company_id = c.id AND q.accepted_at >= now() - INTERVAL '30 days') AS quotes_accepted_30d,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.email_events e WHERE e.company_id = c.id AND e.created_at >= now() - INTERVAL '30 days') = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM public.email_events e WHERE e.company_id = c.id AND e.status = 'failed' AND e.created_at >= now() - INTERVAL '30 days')::NUMERIC /
        (SELECT COUNT(*) FROM public.email_events e WHERE e.company_id = c.id AND e.created_at >= now() - INTERVAL '30 days')::NUMERIC * 100,
        2
      )
    END AS email_failure_rate
  FROM public.companies c
  LEFT JOIN public.company_flags cf ON cf.company_id = c.id
  ORDER BY c.created_at DESC;
END;
$$;

-- Get all quotes for admin view
CREATE OR REPLACE FUNCTION public.admin_get_quotes()
RETURNS TABLE (
  id UUID,
  reference TEXT,
  company_id UUID,
  company_name TEXT,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT,
  total NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    q.id,
    q.reference,
    q.company_id,
    c.business_name AS company_name,
    q.customer_name,
    q.customer_email,
    q.status::TEXT,
    q.total,
    q.created_at,
    q.sent_at,
    q.viewed_at,
    q.accepted_at,
    q.declined_at
  FROM public.quotes q
  JOIN public.companies c ON c.id = q.company_id
  ORDER BY q.created_at DESC;
END;
$$;

-- Get all users with their companies for admin
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  company_id UUID,
  company_name TEXT,
  trade TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    c.user_id,
    c.email,
    c.id AS company_id,
    c.business_name AS company_name,
    c.trade::TEXT,
    c.created_at,
    public.is_admin(c.user_id) AS is_admin
  FROM public.companies c
  ORDER BY c.created_at DESC;
END;
$$;

-- Get company details for admin
CREATE OR REPLACE FUNCTION public.admin_get_company_detail(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'company', (SELECT to_jsonb(c.*) FROM public.companies c WHERE c.id = p_company_id),
    'flags', (SELECT to_jsonb(cf.*) FROM public.company_flags cf WHERE cf.company_id = p_company_id),
    'subscription', (SELECT to_jsonb(s.*) FROM public.subscriptions s WHERE s.company_id = p_company_id),
    'quotes', (
      SELECT jsonb_agg(to_jsonb(q.*) ORDER BY q.created_at DESC)
      FROM public.quotes q WHERE q.company_id = p_company_id
    ),
    'quote_events', (
      SELECT jsonb_agg(to_jsonb(qe.*) ORDER BY qe.created_at DESC)
      FROM public.quote_events qe WHERE qe.company_id = p_company_id
      LIMIT 100
    ),
    'email_events', (
      SELECT jsonb_agg(to_jsonb(ee.*) ORDER BY ee.created_at DESC)
      FROM public.email_events ee WHERE ee.company_id = p_company_id
      LIMIT 100
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get audit log for admin
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  admin_user_id UUID,
  admin_email TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.admin_user_id,
    c.email AS admin_email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.before,
    al.after,
    al.created_at
  FROM public.admin_audit_log al
  LEFT JOIN public.companies c ON c.user_id = al.admin_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;