
ALTER TYPE public.payment_mode RENAME VALUE 'none' TO 'completion';
ALTER TABLE public.quotes ALTER COLUMN payment_mode SET DEFAULT 'completion'::public.payment_mode;
