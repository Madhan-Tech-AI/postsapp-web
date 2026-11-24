-- =============================================================
-- PostsApp V1.0 — Migration 002: Core tables
-- =============================================================

SET search_path TO public;

-- =============================================================
-- 1. profiles  (extends auth.users 1:1)
-- =============================================================
CREATE TABLE public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  avatar_url         TEXT,
  role               public.user_role NOT NULL DEFAULT 'reader',
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  preferred_language public.language_code NOT NULL DEFAULT 'en',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile; role is authoritative for RBAC — never trust JWT claims alone.';
COMMENT ON COLUMN public.profiles.role IS 'Changed only by server-side SuperAdmin operations; every change writes to audit_logs.';

-- Auto-create a profile row when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'reader',   -- Public sign-ups are ALWAYS readers; no metadata can override this
    COALESCE(
      (NEW.raw_user_meta_data->>'preferred_language')::public.language_code,
      'en'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 2. author_profiles  (public bio for authors/editors/superadmin)
-- =============================================================
CREATE TABLE public.author_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio         TEXT        CHECK (char_length(bio) <= 2000),
  photo_path  TEXT,
  twitter_url TEXT        CHECK (photo_path IS NULL OR photo_path ~ '^[a-zA-Z0-9/_.-]+$'),
  facebook_url TEXT,
  website_url  TEXT,
  slug        TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.author_profiles IS 'Public-facing bio page for authors/editors. Created by SuperAdmin when inviting a writer.';

-- =============================================================
-- 3. categories
-- =============================================================
CREATE TABLE public.categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key   TEXT        NOT NULL,              -- Stable identifier shared across language rows
  language    public.language_code NOT NULL,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  slug        TEXT        NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  parent_id   UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (language, slug),
  UNIQUE (group_key, language)
);

COMMENT ON COLUMN public.categories.group_key IS 'Stable machine key (e.g. "national") shared across EN and TA rows.';

-- =============================================================
-- 4. tags
-- =============================================================
CREATE TABLE public.tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key   TEXT        NOT NULL,
  language    public.language_code NOT NULL,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  slug        TEXT        NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_key, language),
  UNIQUE (language, slug)
);

-- =============================================================
-- 5. articles  (core content table)
-- =============================================================
CREATE TABLE public.articles (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_group_id  UUID          NOT NULL DEFAULT gen_random_uuid(),
  language              public.language_code NOT NULL,
  title                 TEXT          NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  subtitle              TEXT          CHECK (char_length(subtitle) <= 300),
  short_description     TEXT          CHECK (char_length(short_description) <= 500),
  slug                  TEXT          NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  content_json          JSONB         NOT NULL DEFAULT '{"type":"doc","content":[]}',
  content_text          TEXT          NOT NULL DEFAULT '',  -- Plain text for search
  cover_image_path      TEXT,
  cover_image_alt       TEXT          CHECK (char_length(cover_image_alt) <= 300),
  author_id             UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status                public.article_status NOT NULL DEFAULT 'draft',
  published_at          TIMESTAMPTZ,
  first_published_at    TIMESTAMPTZ,            -- Set once; never overwritten
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  reading_time_minutes  INTEGER       NOT NULL DEFAULT 1 CHECK (reading_time_minutes >= 1),
  seo_title             TEXT          CHECK (char_length(seo_title) <= 160),
  seo_description       TEXT          CHECK (char_length(seo_description) <= 320),
  canonical_url         TEXT,
  -- Cached counters (display only; authoritative data in event tables)
  view_count            BIGINT        NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  like_count            BIGINT        NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  -- Full-text search vector
  search_vector         TSVECTOR,
  -- Uniqueness: one slug per language
  UNIQUE (language, slug)
);

-- Published articles MUST have all required fields
ALTER TABLE public.articles ADD CONSTRAINT published_articles_must_be_complete
  CHECK (
    status <> 'published'
    OR (
      title IS NOT NULL AND title <> ''
      AND short_description IS NOT NULL AND short_description <> ''
      AND slug IS NOT NULL AND slug <> ''
      AND cover_image_path IS NOT NULL AND cover_image_path <> ''
      AND published_at IS NOT NULL
    )
  );

COMMENT ON TABLE public.articles IS 'Each row is one language version. Translations share translation_group_id.';
COMMENT ON COLUMN public.articles.content_json IS 'ProseMirror/TipTap JSON — source of truth. Validated on save and render.';
COMMENT ON COLUMN public.articles.view_count IS 'Cached display counter. Authoritative data is in article_views.';
COMMENT ON COLUMN public.articles.first_published_at IS 'Set exactly once on first publish; never overwritten by later edits.';

-- =============================================================
-- 6. article_translations  (explicit translation relationships)
-- =============================================================
CREATE TABLE public.article_translations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_group_id UUID NOT NULL,
  article_id           UUID NOT NULL UNIQUE REFERENCES public.articles(id) ON DELETE CASCADE,
  language             public.language_code NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (translation_group_id, language)
);

COMMENT ON TABLE public.article_translations IS 'Explicit map: translation group → article → language. One row per article.';

-- =============================================================
-- 7. article_categories  (one primary + optional additional)
-- =============================================================
CREATE TABLE public.article_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (article_id, category_id)
);

COMMENT ON COLUMN public.article_categories.is_primary IS 'Exactly one row per article must have is_primary = true (enforced by trigger).';

-- =============================================================
-- 8. article_tags
-- =============================================================
CREATE TABLE public.article_tags (
  article_id  UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- =============================================================
-- 9. article_media
-- =============================================================
CREATE TABLE public.article_media (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID          REFERENCES public.articles(id) ON DELETE SET NULL,
  uploader_id     UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  media_type      public.media_type NOT NULL,
  storage_path    TEXT,         -- NULL for youtube embeds
  mime_type       TEXT          CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes BIGINT        CHECK (file_size_bytes > 0),
  alt_text        TEXT          CHECK (char_length(alt_text) <= 500),
  caption         TEXT          CHECK (char_length(caption) <= 500),
  youtube_video_id TEXT         CHECK (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  width           INTEGER,
  height          INTEGER,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT media_has_path_or_youtube CHECK (
    (media_type = 'image' AND storage_path IS NOT NULL AND youtube_video_id IS NULL)
    OR (media_type = 'youtube_embed' AND youtube_video_id IS NOT NULL AND storage_path IS NULL)
  )
);

COMMENT ON COLUMN public.article_media.youtube_video_id IS 'Validated 11-character YouTube video ID. Iframe rendered from template only.';

-- =============================================================
-- 10. article_likes
-- =============================================================
CREATE TABLE public.article_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)   -- DB-enforced deduplication
);

-- =============================================================
-- 11. article_views  (server-recorded events)
-- =============================================================
CREATE TABLE public.article_views (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- No raw IP; salted rotating hash for dedup only
  visitor_hash     TEXT,       -- SHA-256(salt || ip || user_agent) rotated daily; nullable
  session_id       TEXT,       -- Anonymous session identifier
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  dedup_window_key TEXT        NOT NULL,  -- e.g. article_id + date + visitor_hash
  UNIQUE (dedup_window_key)               -- Prevents double-counting in the window
);

COMMENT ON COLUMN public.article_views.visitor_hash IS 'Salted rotating hash — no raw IP stored. See SECURITY.md § View Tracking.';
COMMENT ON COLUMN public.article_views.dedup_window_key IS 'Composite key for deduplication window (e.g. 24h per article per visitor).';

-- =============================================================
-- 12. article_revisions
-- =============================================================
CREATE TABLE public.article_revisions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   UUID        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  editor_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content_json JSONB       NOT NULL,
  title        TEXT        NOT NULL,
  status       public.article_status NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  note         TEXT        CHECK (char_length(note) <= 500)
);

COMMENT ON TABLE public.article_revisions IS 'Immutable snapshots created on every publish/edit. Never updated or deleted.';

-- =============================================================
-- 13. site_settings
-- =============================================================
CREATE TABLE public.site_settings (
  key         TEXT  PRIMARY KEY CHECK (key ~ '^[a-z_]+$'),
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID  REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.site_settings IS 'Single-row-per-key typed settings. Write only via SuperAdmin server actions.';

-- =============================================================
-- 14. audit_logs  (append-only; UPDATE and DELETE are blocked by RLS)
-- =============================================================
CREATE TABLE public.audit_logs (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      public.audit_action NOT NULL,
  target_type TEXT            CHECK (char_length(target_type) <= 100),
  target_id   TEXT            CHECK (char_length(target_id) <= 200),
  metadata    JSONB           NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Append-only audit trail. RLS blocks UPDATE and DELETE for all roles.';
