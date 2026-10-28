/*
  # User roles, approval workflow and FuHong Worker access

  1. Roles
    - profiles.role may now be: user, admin, dev, fuhong_worker, not_authorized

  2. Profile protection (trigger + policy)
    - Only admin / dev users can change another profile's role or approval
    - Nobody can change their own role
    - Nobody can assign or change the dev role from the app (set it in the Dashboard / SQL)
    - Direct SQL / Dashboard edits (auth.uid() is null) are still allowed

  3. FuHong Worker access
    - projects.fuhong_visible controls which projects FuHong Workers can see
    - Restrictive policies make FuHong Workers read-only on project content,
      hide timesheets from them, and block not_authorized users from all data
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'dev', 'fuhong_worker', 'not_authorized'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS fuhong_visible boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT lower(coalesce(role, 'user')) FROM public.profiles WHERE id = auth.uid()),
    'user'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_content()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_role() NOT IN ('fuhong_worker', 'not_authorized')
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(pid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.app_role()
    WHEN 'not_authorized' THEN false
    WHEN 'fuhong_worker' THEN EXISTS (
      SELECT 1 FROM public.projects WHERE id::text = pid AND fuhong_visible
    )
    ELSE true
  END
$$;

-- Profile role / approval protection
CREATE OR REPLACE FUNCTION public.enforce_profile_role_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    NEW.is_authorized := false;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_authorized IS DISTINCT FROM OLD.is_authorized THEN
    SELECT lower(coalesce(role, 'user')) INTO actor
    FROM public.profiles
    WHERE id = auth.uid() AND is_authorized = true;

    IF actor IS NULL OR actor NOT IN ('admin', 'dev') THEN
      RAISE EXCEPTION 'Not allowed to change role or approval';
    END IF;

    IF NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot change your own role';
    END IF;

    IF lower(coalesce(NEW.role, 'user')) = 'dev' OR lower(coalesce(OLD.role, 'user')) = 'dev' THEN
      RAISE EXCEPTION 'The Dev role cannot be assigned or changed from the app';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_role_rules_trigger ON profiles;
CREATE TRIGGER enforce_profile_role_rules_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_rules();

DROP POLICY IF EXISTS "Admins and devs can update other profiles" ON profiles;
CREATE POLICY "Admins and devs can update other profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id <> auth.uid() AND public.app_role() IN ('admin', 'dev'))
  WITH CHECK (id <> auth.uid() AND public.app_role() IN ('admin', 'dev'));

-- projects
DROP POLICY IF EXISTS "role_limit_select" ON projects;
CREATE POLICY "role_limit_select" ON projects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_project(id::text));
DROP POLICY IF EXISTS "role_limit_insert" ON projects;
CREATE POLICY "role_limit_insert" ON projects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_update" ON projects;
CREATE POLICY "role_limit_update" ON projects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_delete" ON projects;
CREATE POLICY "role_limit_delete" ON projects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_write_content());

-- venues
DROP POLICY IF EXISTS "role_limit_select" ON venues;
CREATE POLICY "role_limit_select" ON venues AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_project(project_id::text));
DROP POLICY IF EXISTS "role_limit_insert" ON venues;
CREATE POLICY "role_limit_insert" ON venues AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_update" ON venues;
CREATE POLICY "role_limit_update" ON venues AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_delete" ON venues;
CREATE POLICY "role_limit_delete" ON venues AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_write_content());

-- parts
DROP POLICY IF EXISTS "role_limit_select" ON parts;
CREATE POLICY "role_limit_select" ON parts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_project(project_id::text));
DROP POLICY IF EXISTS "role_limit_insert" ON parts;
CREATE POLICY "role_limit_insert" ON parts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_update" ON parts;
CREATE POLICY "role_limit_update" ON parts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_delete" ON parts;
CREATE POLICY "role_limit_delete" ON parts AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_write_content());

-- events
DROP POLICY IF EXISTS "role_limit_select" ON events;
CREATE POLICY "role_limit_select" ON events AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_project(project_id::text));
DROP POLICY IF EXISTS "role_limit_insert" ON events;
CREATE POLICY "role_limit_insert" ON events AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_update" ON events;
CREATE POLICY "role_limit_update" ON events AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_delete" ON events;
CREATE POLICY "role_limit_delete" ON events AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_write_content());

-- comments (visible only for parts the user can see)
DROP POLICY IF EXISTS "role_limit_select" ON comments;
CREATE POLICY "role_limit_select" ON comments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    CASE public.app_role()
      WHEN 'not_authorized' THEN false
      WHEN 'fuhong_worker' THEN EXISTS (SELECT 1 FROM parts WHERE parts.id::text = comments.part_id::text)
      ELSE true
    END
  );
DROP POLICY IF EXISTS "role_limit_insert" ON comments;
CREATE POLICY "role_limit_insert" ON comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_update" ON comments;
CREATE POLICY "role_limit_update" ON comments AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());
DROP POLICY IF EXISTS "role_limit_delete" ON comments;
CREATE POLICY "role_limit_delete" ON comments AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_write_content());

-- resin_records: FuHong Workers can use them, but only for projects they can see
DROP POLICY IF EXISTS "role_limit_select" ON resin_records;
CREATE POLICY "role_limit_select" ON resin_records AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_access_project(project_id::text));
DROP POLICY IF EXISTS "role_limit_insert" ON resin_records;
CREATE POLICY "role_limit_insert" ON resin_records AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.app_role() <> 'not_authorized');
DROP POLICY IF EXISTS "role_limit_update" ON resin_records;
CREATE POLICY "role_limit_update" ON resin_records AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.app_role() <> 'not_authorized') WITH CHECK (public.app_role() <> 'not_authorized');
DROP POLICY IF EXISTS "role_limit_delete" ON resin_records;
CREATE POLICY "role_limit_delete" ON resin_records AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.app_role() <> 'not_authorized');

-- timesheets: not available to FuHong Workers
DROP POLICY IF EXISTS "role_limit_all" ON timesheets;
CREATE POLICY "role_limit_all" ON timesheets AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());

-- part_type_counters: part creation is not available to FuHong Workers
DROP POLICY IF EXISTS "role_limit_all" ON part_type_counters;
CREATE POLICY "role_limit_all" ON part_type_counters AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.can_write_content()) WITH CHECK (public.can_write_content());

-- quick_test_reports: FuHong Workers can view but not submit
DROP POLICY IF EXISTS "role_limit_select" ON quick_test_reports;
CREATE POLICY "role_limit_select" ON quick_test_reports AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.app_role() <> 'not_authorized');
DROP POLICY IF EXISTS "role_limit_insert" ON quick_test_reports;
CREATE POLICY "role_limit_insert" ON quick_test_reports AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content());
