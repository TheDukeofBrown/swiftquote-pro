-- Add INSERT policies for subscriptions table (needed for trigger to work)
CREATE POLICY "System can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

-- Add INSERT policies for usage_records table
CREATE POLICY "System can insert usage records"
ON public.usage_records
FOR INSERT
WITH CHECK (true);

-- Create subscription and usage for existing companies that don't have them
INSERT INTO public.subscriptions (company_id, plan, status, trial_ends_at)
SELECT c.id, 'free', 'trialing', now() + INTERVAL '14 days'
FROM public.companies c
LEFT JOIN public.subscriptions s ON s.company_id = c.id
WHERE s.id IS NULL;

INSERT INTO public.usage_records (company_id, period_start)
SELECT c.id, date_trunc('month', now())::date
FROM public.companies c
LEFT JOIN public.usage_records u ON u.company_id = c.id AND u.period_start = date_trunc('month', now())::date
WHERE u.id IS NULL;