ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);

