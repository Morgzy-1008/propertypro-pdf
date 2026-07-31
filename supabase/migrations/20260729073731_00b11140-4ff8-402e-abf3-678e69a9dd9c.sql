CREATE POLICY "facades_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'facades');
CREATE POLICY "facades_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facades');
CREATE POLICY "facades_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'facades') WITH CHECK (bucket_id = 'facades');