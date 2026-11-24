-- =============================================================
-- PostsApp V1.0 — Migration 004: RBAC helper functions
-- =============================================================
-- All helpers: SECURITY DEFINER, fixed search_path, STABLE where applicable.
-- Never accept user-id as a parameter — always read from auth.uid().
-- =============================================================

SET search_path TO public;

-- =============================================================
-- Helper: get the authenticated user's role from profiles
-- (Never trust JWT claims / user_metadata for authorization)
-- =============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Returns the role of the currently authenticated user from the profiles table. Never trust JWT claims.';

-- =============================================================
-- Helper predicates (used in RLS policies)
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_author()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('author', 'editor', 'super_admin')
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('editor', 'super_admin')
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$;

-- =============================================================
-- published_articles view (single source of truth for public data)
-- =============================================================
-- All public queries (homepage, category, search, sitemap, trending)
-- read through this view. No duplicated "is this public?" logic.
-- =============================================================
CREATE OR REPLACE VIEW public.published_articles AS
SELECT
  a.*,
  ap.bio        AS author_bio,
  ap.slug       AS author_slug,
  p.display_name AS author_display_name,
  p.avatar_url   AS author_avatar_url
FROM public.articles a
  JOIN public.profiles p ON p.id = a.author_id
  LEFT JOIN public.author_profiles ap ON ap.user_id = a.author_id
WHERE a.status = 'published';

COMMENT ON VIEW public.published_articles IS
  'Public read view: only published articles with author info. Used by all public queries.';

-- =============================================================
-- RPC: increment_view_count (SECURITY DEFINER — called from route handler)
-- Writes a view event and updates the cached counter atomically.
-- User ID taken from session, never from parameter.
-- Rate limiting and dedup enforced by the caller (route handler).
-- =============================================================
CREATE OR REPLACE FUNCTION public.record_article_view(
  p_article_id      UUID,
  p_visitor_hash    TEXT DEFAULT NULL,
  p_session_id      TEXT DEFAULT NULL,
  p_dedup_window_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_article_exists BOOLEAN;
BEGIN
  -- Verify the article is published (no view counting for drafts)
  SELECT EXISTS (
    SELECT 1 FROM public.articles
    WHERE id = p_article_id AND status = 'published'
  ) INTO v_article_exists;

  IF NOT v_article_exists THEN
    RETURN; -- Silently ignore; don't leak article existence
  END IF;

  -- Insert view event (UNIQUE on dedup_window_key prevents double-counting)
  INSERT INTO public.article_views (
    article_id, visitor_hash, session_id, user_id, dedup_window_key
  )
  VALUES (
    p_article_id,
    p_visitor_hash,
    p_session_id,
    auth.uid(),   -- NULL for anon visitors; from session, never parameter
    COALESCE(p_dedup_window_key, p_article_id::TEXT || '_' || TO_CHAR(now(), 'YYYY-MM-DD'))
  )
  ON CONFLICT (dedup_window_key) DO NOTHING;

  -- Update cached counter only if the insert landed
  IF FOUND THEN
    UPDATE public.articles
    SET view_count = view_count + 1
    WHERE id = p_article_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.record_article_view IS
  'Server-only RPC. Rate limiting and bot filtering enforced by the calling route handler.';

-- =============================================================
-- RPC: toggle_article_like (SECURITY DEFINER)
-- Returns: 'liked' | 'unliked'
-- User ID taken from session, never from parameter.
-- =============================================================
CREATE OR REPLACE FUNCTION public.toggle_article_like(
  p_article_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_exists     BOOLEAN;
  v_published  BOOLEAN;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Article must be published
  SELECT EXISTS (
    SELECT 1 FROM public.articles
    WHERE id = p_article_id AND status = 'published'
  ) INTO v_published;

  IF NOT v_published THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  -- Toggle
  SELECT EXISTS (
    SELECT 1 FROM public.article_likes
    WHERE article_id = p_article_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.article_likes
    WHERE article_id = p_article_id AND user_id = v_user_id;

    UPDATE public.articles
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = p_article_id;

    RETURN 'unliked';
  ELSE
    INSERT INTO public.article_likes (article_id, user_id)
    VALUES (p_article_id, v_user_id);

    UPDATE public.articles
    SET like_count = like_count + 1
    WHERE id = p_article_id;

    RETURN 'liked';
  END IF;
END;
$$;

-- =============================================================
-- RPC: change_user_role (SuperAdmin only; writes audit log)
-- User ID taken from session, never from parameter.
-- =============================================================
CREATE OR REPLACE FUNCTION public.change_user_role(
  p_target_user_id UUID,
  p_new_role       public.user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id         UUID := auth.uid();
  v_actor_role       public.user_role;
  v_target_role      public.user_role;
  v_super_admin_count INTEGER;
BEGIN
  -- Verify actor is an active SuperAdmin
  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = v_actor_id AND is_active = TRUE;

  IF v_actor_role <> 'super_admin' THEN
    -- Log the failed attempt
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (v_actor_id, 'failed_privilege_attempt', 'user', p_target_user_id::TEXT,
            jsonb_build_object('attempted_action', 'change_user_role', 'requested_role', p_new_role));
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Get target's current role
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent demoting the last SuperAdmin
  IF v_target_role = 'super_admin' AND p_new_role <> 'super_admin' THEN
    SELECT COUNT(*) INTO v_super_admin_count
    FROM public.profiles
    WHERE role = 'super_admin' AND is_active = TRUE;

    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last SuperAdmin';
    END IF;
  END IF;

  -- Update role
  UPDATE public.profiles SET role = p_new_role WHERE id = p_target_user_id;

  -- Write audit log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_actor_id,
    'role_change',
    'user',
    p_target_user_id::TEXT,
    jsonb_build_object('old_role', v_target_role, 'new_role', p_new_role)
  );
END;
$$;

COMMENT ON FUNCTION public.change_user_role IS
  'SuperAdmin-only. Verifies the last-SuperAdmin guard and writes an audit log entry.';

-- Grant execute only to authenticated users (RPC validates role internally)
GRANT EXECUTE ON FUNCTION public.record_article_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_article_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role TO authenticated;
-- Helper predicates: anon needs current_user_role for RLS
GRANT EXECUTE ON FUNCTION public.current_user_role TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_author TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user TO anon, authenticated;
