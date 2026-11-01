ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_type TEXT;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_has_content;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_has_content
  CHECK (body IS NOT NULL OR audio_path IS NOT NULL OR image_path IS NOT NULL OR message_type IS NOT NULL);

REVOKE UPDATE, DELETE ON public.messages FROM authenticated;
GRANT UPDATE (body, is_edited), DELETE ON public.messages TO authenticated;

CREATE POLICY "messages_update_sender" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    AND private.is_conversation_participant(conversation_id, auth.uid())
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND private.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "messages_delete_sender" ON public.messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    AND private.is_conversation_participant(conversation_id, auth.uid())
  );
