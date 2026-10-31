INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Avatar Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Upload Policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar Update Policy" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Delete Policy" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

