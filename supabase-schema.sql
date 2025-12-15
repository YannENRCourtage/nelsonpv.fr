-- Activer extension pour UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- SCHEMA: public (utilise public par défaut)
-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'user',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  config jsonb DEFAULT '{}'::jsonb,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table: nv65 (example based on repo api/nv65)
CREATE TABLE IF NOT EXISTS public.nv65 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- A small helper function to keep updated_at in sync (optional)
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_contacts
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_projects
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_nv65
BEFORE UPDATE ON public.nv65
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Example Row-Level Security (RLS) policies (opt-in)
-- Enable RLS on tables you want to protect:
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Example policy: allow authenticated user to select/update their own user row
CREATE POLICY "users_is_owner" ON public.users
FOR ALL
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- Example policy: allow authenticated users to manage their contacts
CREATE POLICY "contacts_for_user" ON public.contacts
FOR ALL
USING ( user_id IS NULL OR auth.uid() = user_id )
WITH CHECK ( user_id = auth.uid() OR user_id IS NULL );

-- Example policy: allow project owners to manage their projects
CREATE POLICY "projects_owner_policy" ON public.projects
FOR ALL
USING ( owner_id = auth.uid() )
WITH CHECK ( owner_id = auth.uid() );

-- Example policy: notifications visible to the notification owner
CREATE POLICY "notifications_owner" ON public.notifications
FOR ALL
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

-- Grant minimal privileges to anon authenticated roles if desired (example)
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT ON public.notifications TO authenticated;

-- Final: vacuum analyze (optional for stats)
ANALYZE;
