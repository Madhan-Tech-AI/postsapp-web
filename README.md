# PostsApp V1.0 — Web Platform

Bilingual (English + Tamil) digital news publishing platform.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript strict
- **Styling**: Tailwind CSS + design tokens; Tamil fonts via `next/font`
- **Editor**: TipTap with ProseMirror JSON in JSONB
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Validation**: Zod on every external input
- **Testing**: Vitest (unit), Playwright (e2e), dedicated RLS security suite

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Start local Supabase
supabase start

# 4. Apply migrations
npm run db:migrate

# 5. Seed categories and site settings
npm run db:seed

# 6. Create the first SuperAdmin (interactive prompt)
npm run db:bootstrap

# 7. Start the dev server
npm run dev
```

## Project Structure

```
src/
  app/
    [locale]/          # Language-prefixed public pages (en, ta)
    admin/             # Editorial workspace + admin console
    api/               # Route handlers
  modules/
    articles/          # Article CRUD, publishing engine, bilingual
    auth/              # Auth flows, session management
    engagement/        # Likes, views, sharing
    media/             # Upload, storage, processing
    admin/             # Analytics, audit logs, settings
    seo/               # Metadata, sitemap, hreflang, JSON-LD
  lib/
    supabase/
      admin.ts         # Service-role client (server-only)
      server.ts        # SSR client (server-only)
      client.ts        # Browser client (anon key only)
    schemas/           # Zod validation schemas
    utils.ts           # Shared utilities
  messages/            # i18n strings (en.json, ta.json)
  tests/
    unit/              # Vitest unit tests
    security/          # RLS/security tests (needs local Supabase)
    e2e/               # Playwright end-to-end tests
supabase/
  migrations/          # Versioned SQL migrations (run in order)
  config.toml          # Local Supabase config
scripts/
  bootstrap-superadmin.ts   # Interactive SuperAdmin setup
  seed.ts                   # Category + settings seed
docs/
  permissions-matrix.md
  bilingual-architecture.md
```

## Architecture

### Modular Monolith

Code is organised by **domain module** (`articles`, `auth`, `engagement`, `media`, `admin`, `seo`), not by technical layer. Each module owns its types, server actions, route handlers, and components.

### RLS Model

RLS is **enabled and forced** on every table. Default deny. Policies:

| Role | Articles | Profiles | Audit Logs |
|---|---|---|---|
| `anon` | Published only (SELECT) | None | None |
| `reader` | Published only (SELECT) | Own only | Own actions |
| `author` | Own articles (all statuses) | Own only | Own actions |
| `editor` | All articles | Authors' profiles | Article logs |
| `super_admin` | All | All | All |

Authorization source of truth: `profiles.role` in the database. JWT claims are **never trusted** for authorization decisions.

### Publishing Flow

1. Authenticate → verify role + ownership (server-side)
2. Validate mandatory fields + language + slug uniqueness
3. Validate + sanitise TipTap JSON (allowlist schema)
4. Set `status = 'published'`, set `first_published_at` (once)
5. Create revision snapshot
6. Write audit log row
7. Invalidate ISR caches

All steps are atomic. Failure rolls back everything.

### Bilingual Architecture

- One **translation group** (`translation_group_id`) per story
- Each language version (`en`/`ta`) is an independent `articles` row
- Slugs unique **per language** (`UNIQUE (language, slug)`)
- Likes and views are independent per language version
- Publishing/unpublishing one language never affects the other
- Language switcher goes to the translation if it exists, else to the localized home/category

### Security Key Decisions

- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**; imported via `src/lib/supabase/admin.ts` which is `server-only` (build fails if imported from client code)
- Role checks use `SECURITY DEFINER` SQL functions with fixed `search_path = ''`
- No `exec_sql` or arbitrary SQL RPC — schema changes via migrations only
- TipTap JSON validated against an allowlist schema on every save and render
- YouTube embeds: store only the validated 11-character video ID; iframe rendered from template
- View tracking: no raw IP stored; salted rotating hash for dedup only
- Rate limiting on all mutation endpoints

## Running Tests

```bash
# Unit tests (no Supabase required)
npm test

# Security/RLS tests (requires local Supabase running)
supabase start
npm run test:security

# E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint
```

## Migrations

Migrations are in `supabase/migrations/` and run in order:

| File | Description |
|---|---|
| `001_extensions_and_types.sql` | Extensions (uuid-ossp, pg_trgm, pgcrypto), custom enums |
| `002_core_tables.sql` | All 14 core tables |
| `003_indexes_and_triggers.sql` | Indexes, search vector trigger, immutable column guards |
| `004_rbac_functions.sql` | SECURITY DEFINER helpers, RPCs (record_view, toggle_like, change_role) |
| `005_rls_policies.sql` | Row Level Security — default deny + explicit allow per role |
| `006_storage_buckets_and_policies.sql` | Storage buckets + per-bucket RLS |
| `007_seed_data.sql` | 10 categories × EN + TA, default site settings |
| `008_publishing_engine.sql` | Atomic publishing/unpublishing transaction stored procedures |
| `009_like_count_trigger.sql` | Database trigger maintenance of articles.like_count on insert/delete |

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server only** — NEVER `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Browser + Server |
| `CANONICAL_BASE_URL` | Yes | Server (SEO) |

## Open Items (flagged per PRD §15)

- **Delete behaviour**: Authors archive; Editor/SuperAdmin hard delete with audit entry. Controlled by `DELETE_BEHAVIOUR` constant in `src/lib/constants.ts`.
- **Tamil search**: FTS first; `pg_trgm` trigram fallback if recall tests show poor results. Trigram index already created.
- **Email provider**: Configured via Supabase Auth dashboard (SMTP). Placeholder domain: `postsapp.in`.
- **Legal pages**: Placeholder text in `/en/about`, `/en/privacy`, `/en/terms`, `/en/contact`. Marked "Pending legal review."
