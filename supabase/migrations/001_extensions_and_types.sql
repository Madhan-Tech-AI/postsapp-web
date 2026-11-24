-- =============================================================
-- PostsApp V1.0 — Migration 001: Extensions and schema setup
-- =============================================================
-- Run order: 001 → 002 → 003 → 004 → 005 → 006
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram search (Tamil fallback)
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- accent-insensitive search helper
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_bytes for salted hashes

-- Set up search path guard (all our objects live in public)
-- Never set search_path to '' globally here — only in SECURITY DEFINER functions.
SET search_path TO public;

-- =============================================================
-- Custom types / enums
-- =============================================================

CREATE TYPE public.user_role AS ENUM (
  'reader',
  'author',
  'editor',
  'super_admin'
);

CREATE TYPE public.language_code AS ENUM (
  'en',
  'ta'
  -- Architecture supports future additions via ALTER TYPE
);

CREATE TYPE public.article_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE public.media_type AS ENUM (
  'image',
  'youtube_embed'
);

CREATE TYPE public.audit_action AS ENUM (
  'article_publish',
  'article_unpublish',
  'article_archive',
  'article_delete',
  'article_create',
  'article_edit',
  'role_change',
  'user_activate',
  'user_deactivate',
  'user_invite',
  'user_delete',
  'category_create',
  'category_update',
  'category_delete',
  'tag_create',
  'tag_delete',
  'media_delete',
  'site_setting_change',
  'failed_privilege_attempt'
);

COMMENT ON TYPE public.user_role IS 'Four stored roles; reader is the default for public sign-ups.';
COMMENT ON TYPE public.language_code IS 'Supported languages for V1.0. Extend via ALTER TYPE for future locales.';
COMMENT ON TYPE public.article_status IS 'Article lifecycle states.';
