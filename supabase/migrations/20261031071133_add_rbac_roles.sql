-- Migration: Add RBAC Roles & Restrict Listing Mutations
-- Migration ID: 20261031071133_add_rbac_roles.sql

-- 1. Profiles Table Schema Updates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS owner_form_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE;

-- Ensure default role on profiles is 'student'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

-- 2. Enhanced is_owner function requiring role = 'owner' AND admin_approved = TRUE
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND role = 'owner' 
      AND admin_approved = TRUE 
      AND is_deleted = FALSE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Prevent non-admins from modifying roles or approval status
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Security Violation: Only platform administrators can modify user roles or approval status.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Auth trigger to initialize profiles with student/owner defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, owner_form_submitted, admin_approved, last_sign_in_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    FALSE,
    FALSE,
    COALESCE(NEW.last_sign_in_at, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    last_sign_in_at = COALESCE(EXCLUDED.last_sign_in_at, public.profiles.last_sign_in_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies on pg_listings ensuring only approved owners & admins have mutation privileges
DO $$
BEGIN
  -- INSERT Policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pg_listings' AND policyname = 'Owners and Admins can insert listings'
  ) THEN
    ALTER POLICY "Owners and Admins can insert listings" ON public.pg_listings 
    WITH CHECK (((auth.uid() = owner_id) AND (is_owner() OR is_admin())));
  ELSE
    CREATE POLICY "Owners and Admins can insert listings" ON public.pg_listings 
    FOR INSERT TO authenticated 
    WITH CHECK (((auth.uid() = owner_id) AND (is_owner() OR is_admin())));
  END IF;

  -- UPDATE Policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pg_listings' AND policyname = 'Owners and Admins can update listings'
  ) THEN
    ALTER POLICY "Owners and Admins can update listings" ON public.pg_listings 
    USING (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()))
    WITH CHECK (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()));
  ELSE
    CREATE POLICY "Owners and Admins can update listings" ON public.pg_listings 
    FOR UPDATE TO authenticated 
    USING (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()))
    WITH CHECK (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()));
  END IF;

  -- DELETE Policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pg_listings' AND policyname = 'Owners and Admins can delete listings'
  ) THEN
    ALTER POLICY "Owners and Admins can delete listings" ON public.pg_listings 
    USING (((auth.uid() = owner_id AND is_owner()) OR is_admin()));
  ELSE
    CREATE POLICY "Owners and Admins can delete listings" ON public.pg_listings 
    FOR DELETE TO authenticated 
    USING (((auth.uid() = owner_id AND is_owner()) OR is_admin()));
  END IF;
END $$;

-- 6. Ensure public.properties has matching RBAC write protection
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Users can insert properties'
    ) THEN
      ALTER POLICY "Users can insert properties" ON public.properties 
      WITH CHECK (((auth.uid() = owner_id) AND (is_owner() OR is_admin())));
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'Owners can update own properties'
    ) THEN
      ALTER POLICY "Owners can update own properties" ON public.properties 
      USING (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()))
      WITH CHECK (((owner_id = auth.uid() AND is_deleted = false AND is_owner()) OR is_admin()));
    END IF;
  END IF;
END $$;

