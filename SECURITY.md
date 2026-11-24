# SECURITY.md — PostsApp V1.0

## Threat Model

PostsApp is a public-facing news platform with three threat surfaces:

1. **Public web**: Read-only. Threats: XSS via rendered content, SEO poisoning, DDoS via search/view endpoints.
2. **Reader accounts**: Authenticated. Threats: account takeover, like/view manipulation, CSRF on mutations.
3. **Editorial workspace + Admin**: Privileged. Threats: privilege escalation, data exfiltration, content injection, audit log tampering.

---

## Critical Security Controls

### 1. Service-Role Key Isolation

The Supabase service-role key is **server-only**:
- Stored only in `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)
- Imported only via `src/lib/supabase/admin.ts` which starts with `import 'server-only'`
- Build fails if any client component tries to import it
- CI scans `.next/static/` for the key after every build

If you believe the key has been exposed: **rotate it immediately** in the Supabase dashboard under Project Settings → API.

### 2. Row Level Security (RLS)

RLS is **enabled and forced** on every table. See `supabase/migrations/005_rls_policies.sql`.

Default deny — explicit allow policies per role per operation (`SELECT`/`INSERT`/`UPDATE`/`DELETE`).

Role authority comes from `profiles.role` in the database. JWT claims and `user_metadata` are **never used** for authorization decisions.

### 3. SECURITY DEFINER Functions

All `SECURITY DEFINER` functions:
- Have a fixed `search_path = ''`
- Derive the user ID from `auth.uid()` — never from a parameter
- Validate the caller's role internally before acting
- Write to `audit_logs` on privileged actions

No function accepts or executes arbitrary SQL.

### 4. TipTap JSON — XSS Prevention

TipTap content is validated against an allowlist schema (`src/lib/schemas/index.ts`) on **every save and render**:
- Only allowed node types (paragraph, heading, blockquote, lists, image, youtubeEmbed)
- Only allowed mark types (bold, italic, underline, strike, link, textAlign)
- Link hrefs: only `http:`, `https:`, `mailto:` — `javascript:`, `data:`, `vbscript:` are rejected
- YouTube: only the 11-character video ID stored; iframe rendered from a server-side template

The renderer is a React component tree built from validated JSON — `dangerouslySetInnerHTML` is never used with article content.

### 5. Upload Security

Uploads go through a server route handler that:
- Checks role and folder ownership
- Validates **magic bytes** (not just extension or Content-Type)
- Enforces JPEG/PNG/WebP only (SVG allowed only for SuperAdmin site-assets)
- Enforces size limits (10 MB images, 2 MB avatars)
- Strips EXIF data (including GPS) using `sharp`
- Generates a random server-side filename — user-supplied names are never used as storage paths
- Writes metadata to `article_media` for validation on render

### 6. Session Management

- `@supabase/ssr` with HTTP-only, `Secure`, `SameSite=Lax` cookies
- Sessions verified server-side with `getUser()` in middleware and every route handler/server action
- Client-side "isAdmin" checks are **UX only** — not security controls

### 7. Rate Limiting

Applied to: auth endpoints, likes, view tracking, uploads, search.

Implementation: Upstash Redis (preferred for serverless) with fallback to Postgres-backed counting.

### 8. View Tracking Privacy

No raw IP addresses stored. The dedup hash is computed as:
`SHA-256(daily_salt || ip || user_agent)` where `daily_salt` rotates every 24 hours.

This is sufficient for deduplication but cannot be reverse-engineered to identify users.

### 9. Audit Logging

`audit_logs` is append-only: no `UPDATE` or `DELETE` RLS policies exist for any role.

Logged events:
- Article: publish, unpublish/archive, delete, create, edit
- User: role change, activate/deactivate, invite, delete
- Category, tag, media, site setting changes
- Failed privileged attempts

### 10. CSP and Security Headers

Headers set in `next.config.js`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (admin: `frame-ancestors 'none'`)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

YouTube embeds use `youtube-nocookie.com` and are allowed only in the article renderer.

---

## Section 12: Reference Application Weaknesses & PostsApp Guards

The legacy reference panels contained 12 security weaknesses that are explicitly guarded against in PostsApp V1.0:

| # | Reference Weakness | Risk Level | PostsApp Architectural Guard |
|---|---|---|---|
| **1** | Client-submitted author IDs & roles | **CRITICAL** | Authorization ≠ Authentication. Roles are stored in `profiles.role` in PostgreSQL. Server actions & RLS strictly derive `user_id` from `auth.uid()`, never from request payloads. |
| **2** | Storing raw user HTML & rendering via `dangerouslySetInnerHTML` | **CRITICAL** | ProseMirror/TipTap JSON in JSONB is the single source of truth. Rendered through a controlled AST React component tree with zero `dangerouslySetInnerHTML`. Validated against `tiptapDocumentSchema` allowlist. |
| **3** | Service-role key leaked in client bundle | **CRITICAL** | `SUPABASE_SERVICE_ROLE_KEY` is server-only (`import 'server-only'`). No `NEXT_PUBLIC_` prefix. Gitleaks pre-commit hooks and CI scan bundles to reject any client leaks. |
| **4** | Missing or permissive Row Level Security (RLS) | **CRITICAL** | RLS is enabled and forced on **all 14 tables and views** (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`). Default deny with strict granular policies per role. |
| **5** | SQL injection & `search_path` poisoning | **HIGH** | All stored procedures and triggers are declared with `SECURITY DEFINER SET search_path = ''`. Queries use parameterized Supabase PostgREST statements. |
| **6** | Disguised file uploads & EXIF metadata leakage | **HIGH** | Magic bytes inspection rejects disguised files (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WebP). `sharp` re-encodes images and strips all EXIF/GPS metadata. Server generates random UUID storage paths. |
| **7** | Client-side counter increments (view/like spoofing) | **HIGH** | `articles.view_count` and `like_count` are read-only display caches maintained exclusively by database triggers and stored procedures. Client-side increments are impossible. |
| **8** | Anonymous like spam / multiple likes per user | **MEDIUM** | Likes require registered reader authentication. PostgreSQL enforces `UNIQUE (article_id, user_id)` on `article_likes`. Anonymous clicks redirect to login. |
| **9** | Unrestricted public staff registration | **CRITICAL** | Public registration triggers `handle_new_user()` which hardcodes `role = 'reader'`. Editorial staff (`author`, `editor`) can only be created via SuperAdmin invite links. |
| **10** | Last SuperAdmin lockout | **HIGH** | `change_user_role()` stored procedure counts remaining SuperAdmins and throws an exception if an operation would demote or deactivate the last SuperAdmin. |
| **11** | Unaudited privileged mutations & tampering | **HIGH** | `audit_logs` is append-only with no `UPDATE` or `DELETE` permissions. Every publish, unpublish, role change, setting update, and delete writes an immutable audit record. |
| **12** | Bot-driven view inflating & raw IP storage | **MEDIUM** | Bot filter detects and drops crawlers. Rotating salted daily hash (`SHA-256(salt || date || ip || user_agent)`) creates ephemeral dedup keys without storing raw reader IP addresses. |

---

## Known Non-Issues (by design)

- `anon` key is in browser JavaScript — this is by design. It has no privileges beyond what RLS allows (read published articles, categories, tags).
- TipTap is a client-side editor — the content it produces is validated server-side before saving.

---

## Reporting a Vulnerability

Please report security issues to `security@postsapp.in`. Do not open public GitHub issues for security vulnerabilities.

---

## Checklist for New Features

Before shipping any feature that touches security boundaries:

- [ ] Does it add a new table? → Enable RLS + Force RLS + Default deny policies
- [ ] Does it add a new RPC? → SECURITY DEFINER, fixed `search_path = ''`, no user-supplied IDs
- [ ] Does it accept user input? → Zod schema with `.strict()`, max lengths, allowlist
- [ ] Does it write to storage? → Magic byte validation, random filename, folder ownership check
- [ ] Does it render user content? → React component tree from validated JSON, no `dangerouslySetInnerHTML`
- [ ] Does it use a privileged key? → server-only import, no `NEXT_PUBLIC_` prefix
- [ ] Does it change authorization state? → Write audit log, verify last-SuperAdmin guard
