
-- Rate limit increment function (used by edge functions with service role)
CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_key TEXT, p_window TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limit_counters (key, window_start, count)
  VALUES (p_key, p_window::timestamptz, 1)
  ON CONFLICT (key, window_start) 
  DO UPDATE SET count = rate_limit_counters.count + 1;
END;
$$;
