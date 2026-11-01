CREATE TABLE IF NOT EXISTS public.contact_aliases (
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, contact_id),
  CONSTRAINT contact_aliases_distinct_users CHECK (owner_id <> contact_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_aliases TO authenticated;
ALTER TABLE public.contact_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_aliases_select_owner" ON public.contact_aliases;
CREATE POLICY "contact_aliases_select_owner" ON public.contact_aliases
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "contact_aliases_insert_owner" ON public.contact_aliases;
CREATE POLICY "contact_aliases_insert_owner" ON public.contact_aliases
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "contact_aliases_update_owner" ON public.contact_aliases;
CREATE POLICY "contact_aliases_update_owner" ON public.contact_aliases
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "contact_aliases_delete_owner" ON public.contact_aliases;
CREATE POLICY "contact_aliases_delete_owner" ON public.contact_aliases
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
