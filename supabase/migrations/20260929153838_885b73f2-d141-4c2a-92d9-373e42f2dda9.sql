CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_conversation_participant(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND _user_id IN (c.user_a, c.user_b)
  )
$$;
REVOKE ALL ON FUNCTION private.is_conversation_participant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_conversation_participant(UUID, UUID) TO authenticated;

DROP POLICY "messages_select_participant" ON public.messages;
DROP POLICY "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT TO authenticated
  USING (private.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND private.is_conversation_participant(conversation_id, auth.uid()));
DROP FUNCTION public.is_conversation_participant(UUID, UUID);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_conversation() FROM anon, authenticated;