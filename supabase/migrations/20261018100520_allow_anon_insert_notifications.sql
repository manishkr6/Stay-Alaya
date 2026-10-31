DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Anon can insert notifications'
  ) THEN
    CREATE POLICY "Anon can insert notifications" ON public.notifications FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

