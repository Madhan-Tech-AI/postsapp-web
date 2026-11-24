-- =============================================================
-- PostsApp V1.0 — Migration 008: Atomic Publishing Engine
-- Section 8: Single atomic transaction for publishing & unpublishing
-- =============================================================

SET search_path TO public;

-- =============================================================
-- RPC: publish_article_transaction
-- Atomically validates, publishes, creates a revision snapshot,
-- and writes an audit log row in a single PostgreSQL transaction.
-- If ANY step fails, the transaction aborts and rolls back completely.
-- =============================================================
CREATE OR REPLACE FUNCTION public.publish_article_transaction(
  p_article_id UUID,
  p_actor_id   UUID,
  p_note       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_article         public.articles%ROWTYPE;
  v_actor_role      public.user_role;
  v_actor_active    BOOLEAN;
  v_has_category    BOOLEAN;
  v_now             TIMESTAMPTZ := now();
  v_first_published TIMESTAMPTZ;
BEGIN
  -- 1. Authenticate & verify actor is active
  SELECT role, is_active INTO v_actor_role, v_actor_active
  FROM public.profiles
  WHERE id = p_actor_id;

  IF v_actor_role IS NULL OR NOT v_actor_active THEN
    RAISE EXCEPTION 'Actor is not active or unauthorized';
  END IF;

  -- 2. Verify actor has editorial privileges
  IF v_actor_role NOT IN ('author', 'editor', 'super_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to publish articles';
  END IF;

  -- 3. Lock and fetch article row
  SELECT * INTO v_article
  FROM public.articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  -- 4. Verify ownership: Authors can only publish their own articles
  IF v_actor_role = 'author' AND v_article.author_id <> p_actor_id THEN
    -- Log failed privilege escalation attempt
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (p_actor_id, 'failed_privilege_attempt', 'article', p_article_id::TEXT,
            jsonb_build_object('reason', 'Author attempted to publish another authors article'));
    RAISE EXCEPTION 'Authors may only publish their own articles';
  END IF;

  -- 5. Validate mandatory fields required for publication
  IF v_article.title IS NULL OR char_length(trim(v_article.title)) = 0 THEN
    RAISE EXCEPTION 'Article title is required to publish';
  END IF;

  IF v_article.short_description IS NULL OR char_length(trim(v_article.short_description)) = 0 THEN
    RAISE EXCEPTION 'Short description is required to publish';
  END IF;

  IF v_article.slug IS NULL OR char_length(trim(v_article.slug)) = 0 THEN
    RAISE EXCEPTION 'Slug is required to publish';
  END IF;

  IF v_article.cover_image_path IS NULL OR char_length(trim(v_article.cover_image_path)) = 0 THEN
    RAISE EXCEPTION 'Cover image is required to publish';
  END IF;

  -- Verify at least one primary category is linked
  SELECT EXISTS (
    SELECT 1 FROM public.article_categories
    WHERE article_id = p_article_id AND is_primary = TRUE
  ) INTO v_has_category;

  IF NOT v_has_category THEN
    RAISE EXCEPTION 'Article must have a primary category to be published';
  END IF;

  -- 6. Set first_published_at once (never overwrite on subsequent republishes/edits)
  v_first_published := COALESCE(v_article.first_published_at, v_now);

  -- 7. Update article to published
  UPDATE public.articles
  SET
    status = 'published',
    published_at = v_now,
    first_published_at = v_first_published,
    updated_at = v_now
  WHERE id = p_article_id;

  -- 8. Create revision snapshot
  INSERT INTO public.article_revisions (
    article_id,
    editor_id,
    content_json,
    title,
    status,
    note
  )
  VALUES (
    p_article_id,
    p_actor_id,
    v_article.content_json,
    v_article.title,
    'published',
    COALESCE(p_note, 'Published article')
  );

  -- 9. Write audit log entry
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'article_publish',
    'article',
    p_article_id::TEXT,
    jsonb_build_object(
      'title', v_article.title,
      'slug', v_article.slug,
      'language', v_article.language,
      'first_published', v_article.first_published_at IS NULL
    )
  );

  -- Return success details for cache revalidation
  RETURN jsonb_build_object(
    'success', true,
    'article_id', p_article_id,
    'slug', v_article.slug,
    'language', v_article.language,
    'published_at', v_now
  );
END;
$$;

-- =============================================================
-- RPC: unpublish_article_transaction (Archive)
-- Atomically removes from public access, snapshots revision, and logs
-- =============================================================
CREATE OR REPLACE FUNCTION public.unpublish_article_transaction(
  p_article_id UUID,
  p_actor_id   UUID,
  p_note       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_article    public.articles%ROWTYPE;
  v_actor_role public.user_role;
  v_now        TIMESTAMPTZ := now();
BEGIN
  -- Authenticate actor
  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = p_actor_id AND is_active = TRUE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock article
  SELECT * INTO v_article
  FROM public.articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  -- Ownership check
  IF v_actor_role = 'author' AND v_article.author_id <> p_actor_id THEN
    RAISE EXCEPTION 'Authors may only unpublish their own articles';
  END IF;

  -- Update to archived
  UPDATE public.articles
  SET
    status = 'archived',
    updated_at = v_now
  WHERE id = p_article_id;

  -- Revision snapshot
  INSERT INTO public.article_revisions (
    article_id,
    editor_id,
    content_json,
    title,
    status,
    note
  )
  VALUES (
    p_article_id,
    p_actor_id,
    v_article.content_json,
    v_article.title,
    'archived',
    COALESCE(p_note, 'Unpublished / Archived article')
  );

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'article_archive',
    'article',
    p_article_id::TEXT,
    jsonb_build_object(
      'title', v_article.title,
      'slug', v_article.slug,
      'language', v_article.language
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'article_id', p_article_id,
    'slug', v_article.slug,
    'language', v_article.language
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_article_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_article_transaction TO authenticated;
