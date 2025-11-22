-- Quick Setup SQL for Waitlist Table
-- Copy and paste this into Supabase Dashboard → SQL Editor → Run

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

-- Disable RLS to allow anonymous inserts for waitlist
ALTER TABLE public.waitlist_leads DISABLE ROW LEVEL SECURITY;

-- Verify the table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'waitlist_leads'
ORDER BY ordinal_position;

