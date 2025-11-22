CREATE TABLE IF NOT EXISTS public.waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  target_language TEXT NOT NULL,
  base_language TEXT NOT NULL,
  reason TEXT NOT NULL
);

-- For now, keep RLS disabled so anonymous waitlist inserts work.
ALTER TABLE public.waitlist_leads DISABLE ROW LEVEL SECURITY;


