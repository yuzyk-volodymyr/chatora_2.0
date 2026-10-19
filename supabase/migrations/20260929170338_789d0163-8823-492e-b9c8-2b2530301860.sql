ALTER TABLE public.messages ADD COLUMN audio_path TEXT;
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_has_content CHECK (body IS NOT NULL OR audio_path IS NOT NULL);

CREATE POLICY "Participants read voice" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice' AND private.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Participants upload voice" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice' AND private.is_conversation_participant(((storage.foldername(name))[1])::uuid, auth.uid()));