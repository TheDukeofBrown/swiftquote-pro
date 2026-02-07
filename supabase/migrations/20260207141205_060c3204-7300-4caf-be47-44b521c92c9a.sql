-- Create admin_get_events function to return unified quote_events + email_events
CREATE OR REPLACE FUNCTION public.admin_get_events(
  p_company_id uuid DEFAULT NULL,
  p_quote_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_date_from timestamp with time zone DEFAULT NULL,
  p_date_to timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  company_name text,
  quote_id uuid,
  quote_reference text,
  event_source text,
  event_type text,
  payload jsonb,
  error text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  (
    -- Quote events
    SELECT 
      qe.id,
      qe.company_id,
      c.business_name AS company_name,
      qe.quote_id,
      q.reference AS quote_reference,
      'quote'::text AS event_source,
      qe.event_type,
      qe.payload,
      NULL::text AS error,
      qe.created_at
    FROM public.quote_events qe
    JOIN public.companies c ON c.id = qe.company_id
    LEFT JOIN public.quotes q ON q.id = qe.quote_id
    WHERE 
      (p_company_id IS NULL OR qe.company_id = p_company_id)
      AND (p_quote_id IS NULL OR qe.quote_id = p_quote_id)
      AND (p_event_type IS NULL OR qe.event_type = p_event_type)
      AND (p_date_from IS NULL OR qe.created_at >= p_date_from)
      AND (p_date_to IS NULL OR qe.created_at <= p_date_to)
  )
  UNION ALL
  (
    -- Email events
    SELECT 
      ee.id,
      ee.company_id,
      c.business_name AS company_name,
      ee.quote_id,
      q.reference AS quote_reference,
      'email'::text AS event_source,
      ee.status AS event_type,
      jsonb_build_object('to_email', ee.to_email, 'subject', ee.subject, 'provider', ee.provider, 'provider_message_id', ee.provider_message_id) AS payload,
      ee.error,
      ee.created_at
    FROM public.email_events ee
    JOIN public.companies c ON c.id = ee.company_id
    LEFT JOIN public.quotes q ON q.id = ee.quote_id
    WHERE 
      (p_company_id IS NULL OR ee.company_id = p_company_id)
      AND (p_quote_id IS NULL OR ee.quote_id = p_quote_id)
      AND (p_event_type IS NULL OR ee.status = p_event_type)
      AND (p_date_from IS NULL OR ee.created_at >= p_date_from)
      AND (p_date_to IS NULL OR ee.created_at <= p_date_to)
  )
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create admin_resend_quote function
CREATE OR REPLACE FUNCTION public.admin_resend_quote(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quote RECORD;
  v_admin_role admin_role;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get admin role
  SELECT role INTO v_admin_role FROM public.admin_users WHERE user_id = auth.uid();
  
  -- Support role cannot resend
  IF v_admin_role = 'support' THEN
    RAISE EXCEPTION 'Unauthorized: Support role cannot resend quotes';
  END IF;

  -- Get quote
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  
  IF v_quote IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF v_quote.customer_email IS NULL THEN
    RAISE EXCEPTION 'Quote has no customer email';
  END IF;

  -- Log the admin action
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(), 
    'resend_quote', 
    'quote', 
    p_quote_id, 
    to_jsonb(v_quote),
    jsonb_build_object('action', 'resend_requested')
  );

  -- Return success - the actual sending is done via edge function
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', p_quote_id,
    'customer_email', v_quote.customer_email
  );
END;
$$;

-- Create admin_can_modify function to check if admin can perform write actions
CREATE OR REPLACE FUNCTION public.admin_can_modify()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
$$;