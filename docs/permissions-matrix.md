# Permissions Matrix — PostsApp V1.0

## Stored Roles

| Role | Description |
|---|---|
| `reader` | Public sign-up default. Can read and like published articles. |
| `author` | Created by SuperAdmin via invite. Can create/edit/publish own articles. |
| `editor` | Created by SuperAdmin. Can manage all articles and authors. |
| `super_admin` | Full system access. Created only via bootstrap script or by another SuperAdmin. |

> Public visitors (not logged in) are **not** stored roles. They interact as `anon`.

---

## Capability Matrix

| Capability | Anon | Reader | Author | Editor | SuperAdmin |
|---|---|---|---|---|---|
| Read published articles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Like/unlike articles | ❌ | ✅ | ✅ | ✅ | ✅ |
| Share articles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search articles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / manage own account | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own account | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create/edit/publish own articles | ❌ | ❌ | ✅ | ✅ | ✅ |
| Archive own articles | ❌ | ❌ | ✅ | ✅ | ✅ |
| Hard delete own articles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Edit/publish/archive ALL articles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Hard delete any article | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upload media (own articles) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete own media | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any media | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create tags | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete tags | ❌ | ❌ | ❌ | ✅ | ✅ |
| Invite new authors/editors | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| Activate/deactivate users | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| View all analytics | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage site settings | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit logs (own) | ❌ | ✅ | ✅ | ✅ | ✅ |
| View audit logs (articles) | ❌ | ❌ | ❌ | ✅ | ✅ |
| View all audit logs | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload to site-assets | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Hard Rules (enforced in DB, not just UI)

1. **Public registration always creates `reader` role.** The trigger `handle_new_user()` hardcodes `role = 'reader'` regardless of `user_metadata`.
2. **Role changes only via `change_user_role()` RPC** — a `SECURITY DEFINER` function that (a) verifies the caller is an active SuperAdmin, (b) enforces the last-SuperAdmin guard, (c) writes an audit log entry.
3. **A SuperAdmin cannot demote the last remaining SuperAdmin.** Enforced in the RPC with a count check.
4. **`author_id`, `language`, `translation_group_id`, `first_published_at` are immutable** after creation. Enforced by a `BEFORE UPDATE` trigger.
5. **Counters (`view_count`, `like_count`) are written only by server functions** (`SECURITY DEFINER` RPC). No direct client write.
6. **`audit_logs` is append-only.** No `UPDATE` or `DELETE` RLS policy exists for any role, including SuperAdmin.
7. **Authors archive; Editor/SuperAdmin hard delete.** Both operations write an audit log entry. Hard delete calls `audit_logs` INSERT before the `DELETE`.
8. **Editor+ cannot change article `author_id`.** Enforced by trigger even if UPDATE policy allows other fields.

---

## Delete Behaviour (Section 15 default)

| Actor | Action | Result |
|---|---|---|
| Author | "Delete" own draft/published | Sets `status = 'archived'` (soft delete) |
| Editor | "Delete" any article | Hard DELETE + audit log entry |
| SuperAdmin | "Delete" any article | Hard DELETE + audit log entry |

Controlled by `DELETE_SOFT_FOR_AUTHORS = true` constant in `src/lib/constants.ts`. Set to `false` to give Authors hard-delete too (not recommended).

---

## Storage Access

| Bucket | Public Read | Upload | Update | Delete |
|---|---|---|---|---|
| `article-featured` | ✅ | Author (own folder) | Author/Editor | Author/Editor |
| `article-content` | ✅ | Author (own folder) | Author/Editor | Author/Editor |
| `author-avatars` | ✅ | Self | Self | Self/SuperAdmin |
| `site-assets` | ✅ | SuperAdmin only | SuperAdmin only | SuperAdmin only |
| `editorial-temp` | ❌ (private) | Author (own folder) | — | Author/Editor |

"Own folder" = object path starts with `auth.uid()`.
