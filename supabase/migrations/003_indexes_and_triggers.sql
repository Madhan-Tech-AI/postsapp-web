-- =============================================================
-- PostsApp V1.0 — Migration 003: Indexes
-- =============================================================

SET search_path TO public;

-- ---- articles ----
CREATE INDEX idx_articles_lang_status_pub
  ON public.articles (language, status, published_at DESC);

CREATE INDEX idx_articles_author
  ON public.articles (author_id);

CREATE INDEX idx_articles_translation_group
  ON public.articles (translation_group_id);

CREATE INDEX idx_articles_status
  ON public.articles (status);

-- GIN index for full-text search vector
CREATE INDEX idx_articles_search_vector
  ON public.articles USING GIN (search_vector);

-- Trigram index on title + short_description for Tamil fallback search
CREATE INDEX idx_articles_title_trgm
  ON public.articles USING GIN (title gin_trgm_ops);

CREATE INDEX idx_articles_description_trgm
  ON public.articles USING GIN (short_description gin_trgm_ops);

-- ---- article_categories ----
CREATE INDEX idx_article_categories_article
  ON public.article_categories (article_id);

CREATE INDEX idx_article_categories_category
  ON public.article_categories (category_id);

CREATE INDEX idx_article_categories_primary
  ON public.article_categories (article_id) WHERE is_primary = TRUE;

-- ---- article_likes ----
CREATE INDEX idx_article_likes_article
  ON public.article_likes (article_id);

CREATE INDEX idx_article_likes_user
  ON public.article_likes (user_id);

-- ---- article_views ----
CREATE INDEX idx_article_views_article
  ON public.article_views (article_id);

CREATE INDEX idx_article_views_recorded_at
  ON public.article_views (recorded_at DESC);

CREATE INDEX idx_article_views_article_recorded
  ON public.article_views (article_id, recorded_at DESC);

-- ---- article_revisions ----
CREATE INDEX idx_article_revisions_article
  ON public.article_revisions (article_id, created_at DESC);

-- ---- article_translations ----
CREATE INDEX idx_article_translations_group
  ON public.article_translations (translation_group_id);

-- ---- audit_logs ----
CREATE INDEX idx_audit_logs_actor
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX idx_audit_logs_target
  ON public.audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX idx_audit_logs_action
  ON public.audit_logs (action, created_at DESC);

-- ---- author_profiles ----
CREATE INDEX idx_author_profiles_user
  ON public.author_profiles (user_id);

-- ---- categories ----
CREATE INDEX idx_categories_group_key
  ON public.categories (group_key);

CREATE INDEX idx_categories_lang
  ON public.categories (language, sort_order);

-- =============================================================
-- Search vector update function and trigger
-- =============================================================

-- Function that recomputes the tsvector for an article
CREATE OR REPLACE FUNCTION public.articles_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, subtitle, short_description, content_text
  ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_search_vector_update();

-- =============================================================
-- Trigger: enforce exactly one primary category per article
-- =============================================================
CREATE OR REPLACE FUNCTION public.enforce_one_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    -- Clear any existing primary for this article
    UPDATE public.article_categories
    SET is_primary = FALSE
    WHERE article_id = NEW.article_id
      AND id <> NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_one_primary_category_trigger
  BEFORE INSERT OR UPDATE ON public.article_categories
  FOR EACH ROW WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION public.enforce_one_primary_category();

-- =============================================================
-- Trigger: protect immutable columns on articles
-- (author_id, first_published_at, language, translation_group_id)
-- =============================================================
CREATE OR REPLACE FUNCTION public.protect_article_immutable_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- author_id cannot be changed by anyone (use audit + hard delete for reassignment)
  IF NEW.author_id <> OLD.author_id THEN
    RAISE EXCEPTION 'author_id is immutable after creation';
  END IF;

  -- first_published_at: once set, never overwrite
  IF OLD.first_published_at IS NOT NULL AND NEW.first_published_at IS DISTINCT FROM OLD.first_published_at THEN
    RAISE EXCEPTION 'first_published_at is immutable once set';
  END IF;

  -- language cannot change
  IF NEW.language <> OLD.language THEN
    RAISE EXCEPTION 'article language is immutable';
  END IF;

  -- translation_group_id cannot change
  IF NEW.translation_group_id <> OLD.translation_group_id THEN
    RAISE EXCEPTION 'translation_group_id is immutable after creation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_article_immutable_columns_trigger
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.protect_article_immutable_columns();

-- =============================================================
-- Trigger: auto-update updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_author_profiles_updated_at
  BEFORE UPDATE ON public.author_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
