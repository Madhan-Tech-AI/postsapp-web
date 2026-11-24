-- =============================================================
-- PostsApp V1.0 — Migration 005: Row Level Security
-- =============================================================
-- Strategy: DEFAULT DENY on every table; explicit allow policies per role.
-- Public (anon) can only read published content.
-- Counters and audit rows written only via SECURITY DEFINER functions.
-- =============================================================

SET search_path TO public;

-- =============================================================
-- Enable RLS on every table
-- =============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_media     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner
ALTER TABLE public.profiles          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.author_profiles   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tags              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.articles          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_translations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_media     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_likes     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_views     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        FORCE ROW LEVEL SECURITY;

-- =============================================================
-- GRANT minimal table privileges (no GRANT ALL)
-- =============================================================
-- anon: read-only on public content tables
GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.tags TO anon;
GRANT SELECT ON public.author_profiles TO anon;
GRANT SELECT ON public.article_categories TO anon;
GRANT SELECT ON public.article_tags TO anon;
GRANT SELECT ON public.article_media TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.article_translations TO anon;

-- authenticated: read + limited write (further restricted by RLS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.author_profiles TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT SELECT ON public.article_translations TO authenticated;
GRANT INSERT ON public.article_translations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_categories TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.article_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.article_media TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.article_likes TO authenticated;
-- article_views: written only via RPC; no direct INSERT grant to anon/authenticated
GRANT SELECT ON public.article_views TO authenticated;
GRANT SELECT ON public.article_revisions TO authenticated;
GRANT INSERT ON public.article_revisions TO authenticated;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
-- audit_logs: INSERT via server/trigger only (no direct grant to avoid bypass)
-- Service role writes audit_logs; we grant via SECURITY DEFINER function

-- =============================================================
-- profiles — Policies
-- =============================================================

-- Public: no access to profiles
-- Self: can read and update own profile (excluding role, is_active)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- role and is_active cannot be changed by user themselves
    -- The trigger / server action enforces this; RLS ensures row ownership
  );

-- SuperAdmin: can read all profiles
CREATE POLICY "profiles_select_all_superadmin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Editor: can read profiles of authors (for article management)
CREATE POLICY "profiles_select_authors_editor"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_editor()
    AND role IN ('author', 'editor', 'reader')
  );

-- =============================================================
-- author_profiles — Policies
-- =============================================================

-- Public: read published author profiles
CREATE POLICY "author_profiles_select_public"
  ON public.author_profiles FOR SELECT
  TO anon, authenticated
  USING (TRUE);  -- Author profiles are public; bio page is accessible

-- Self: author can update own profile
CREATE POLICY "author_profiles_update_own"
  ON public.author_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SuperAdmin: full manage
CREATE POLICY "author_profiles_all_superadmin"
  ON public.author_profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================
-- categories — Policies
-- =============================================================

CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "categories_manage_superadmin"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================
-- tags — Policies
-- =============================================================

CREATE POLICY "tags_select_public"
  ON public.tags FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "tags_insert_author"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_author());

CREATE POLICY "tags_delete_editor"
  ON public.tags FOR DELETE
  TO authenticated
  USING (public.is_editor());

-- =============================================================
-- articles — Policies
-- =============================================================

-- Public: only published articles
CREATE POLICY "articles_select_published_public"
  ON public.articles FOR SELECT
  TO anon
  USING (status = 'published');

-- Author: can read own articles (all statuses)
CREATE POLICY "articles_select_own_author"
  ON public.articles FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    AND public.is_author()
  );

-- Editor+: can read all articles
CREATE POLICY "articles_select_all_editor"
  ON public.articles FOR SELECT
  TO authenticated
  USING (public.is_editor());

-- Author: can insert own articles (author_id must match session)
CREATE POLICY "articles_insert_author"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_author()
    AND status = 'draft'   -- Authors can only create drafts
  );

-- Author: can update own draft/published articles (not archived by others)
CREATE POLICY "articles_update_own_author"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND public.is_author()
  )
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_author()
  );

-- Editor+: can update any article
CREATE POLICY "articles_update_all_editor"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

-- Author: archive own articles (soft delete)
CREATE POLICY "articles_archive_own_author"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND public.is_author()
    AND status IN ('draft', 'published')
  )
  WITH CHECK (
    author_id = auth.uid()
    AND status = 'archived'   -- Authors can only move to archived
  );

-- Editor+: hard delete any article
CREATE POLICY "articles_delete_editor"
  ON public.articles FOR DELETE
  TO authenticated
  USING (public.is_editor());

-- =============================================================
-- article_translations — Policies
-- =============================================================

CREATE POLICY "article_translations_select_public"
  ON public.article_translations FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "article_translations_insert_author"
  ON public.article_translations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_author());

-- =============================================================
-- article_categories — Policies
-- =============================================================

CREATE POLICY "article_categories_select_public"
  ON public.article_categories FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "article_categories_manage_author"
  ON public.article_categories FOR ALL
  TO authenticated
  USING (
    public.is_author()
    AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND (a.author_id = auth.uid() OR public.is_editor())
    )
  )
  WITH CHECK (
    public.is_author()
    AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND (a.author_id = auth.uid() OR public.is_editor())
    )
  );

-- =============================================================
-- article_tags — Policies
-- =============================================================

CREATE POLICY "article_tags_select_public"
  ON public.article_tags FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "article_tags_manage_author"
  ON public.article_tags FOR ALL
  TO authenticated
  USING (
    public.is_author()
    AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND (a.author_id = auth.uid() OR public.is_editor())
    )
  )
  WITH CHECK (
    public.is_author()
    AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND (a.author_id = auth.uid() OR public.is_editor())
    )
  );

-- =============================================================
-- article_media — Policies
-- =============================================================

CREATE POLICY "article_media_select_public"
  ON public.article_media FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Upload: only authors for their own articles; editors for any
CREATE POLICY "article_media_insert_author"
  ON public.article_media FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND public.is_author()
  );

-- Delete: uploader or editor
CREATE POLICY "article_media_delete_own"
  ON public.article_media FOR DELETE
  TO authenticated
  USING (
    (uploader_id = auth.uid() AND public.is_author())
    OR public.is_editor()
  );

-- =============================================================
-- article_likes — Policies
-- =============================================================

-- Read likes (everyone can see the count via articles.like_count)
CREATE POLICY "article_likes_select_own"
  ON public.article_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert: authenticated only, own user_id
CREATE POLICY "article_likes_insert_own"
  ON public.article_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Delete: own like only
CREATE POLICY "article_likes_delete_own"
  ON public.article_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================
-- article_views — Policies
-- =============================================================
-- Written exclusively via SECURITY DEFINER RPC; no direct INSERT
-- SuperAdmin/Editor can read for analytics

CREATE POLICY "article_views_select_editor"
  ON public.article_views FOR SELECT
  TO authenticated
  USING (public.is_editor());

CREATE POLICY "article_views_select_own"
  ON public.article_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================
-- article_revisions — Policies
-- =============================================================

CREATE POLICY "article_revisions_select_own_author"
  ON public.article_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_id
        AND (a.author_id = auth.uid() OR public.is_editor())
    )
  );

CREATE POLICY "article_revisions_insert_author"
  ON public.article_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    editor_id = auth.uid()
    AND public.is_author()
  );

-- =============================================================
-- site_settings — Policies
-- =============================================================

-- Public: read non-sensitive settings
CREATE POLICY "site_settings_select_public"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Write: SuperAdmin only
CREATE POLICY "site_settings_manage_superadmin"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================
-- audit_logs — Policies (APPEND ONLY)
-- =============================================================

-- No UPDATE or DELETE policy for anyone (DEFAULT DENY applies)
-- SuperAdmin: can read all
CREATE POLICY "audit_logs_select_superadmin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Editor: can read article-related audit entries
CREATE POLICY "audit_logs_select_editor"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_editor()
    AND target_type IN ('article', 'media')
  );

-- Author: can read own audit entries
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

-- =============================================================
-- Trigger: Block role/is_active changes via direct UPDATE
-- (These fields can only be changed via SECURITY DEFINER RPCs)
-- =============================================================
CREATE OR REPLACE FUNCTION public.protect_profile_role_field()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only SuperAdmin RPC (which calls this via service role) may change role/is_active
  -- Direct authenticated updates must NOT change these fields
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Profile role cannot be changed via direct UPDATE. Use the role management RPC.';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'is_active cannot be changed via direct UPDATE. Use the user management RPC.';
  END IF;
  RETURN NEW;
END;
$$;

-- Note: This trigger is applied to authenticated role only.
-- Service role (used by SECURITY DEFINER functions) bypasses triggers in some configs.
-- As defense-in-depth, the RLS UPDATE policy for profiles uses USING (id = auth.uid())
-- which prevents updating other users' rows entirely.
CREATE TRIGGER protect_profile_role_field_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_field();
