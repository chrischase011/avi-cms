# Avi CMS API

All endpoints live under `/api` and speak JSON. Dates are ISO 8601 strings.

## Conventions

**Authentication.** The admin API uses an HTTP-only session cookie (`avi_cms_session`, a JWT) set
by `POST /api/auth/login`. Browsers send it automatically; use `credentials: 'include'` (or
same-origin requests through the Vite proxy).

**CSRF.** Every `POST`, `PUT`, `PATCH` and `DELETE` under `/api` (except `/api/public/*`) must send
the header `x-csrf-token` with the value of the `avi_cms_csrf` cookie. Call `GET /api/auth/csrf`
once at startup to make sure the cookie exists (it also returns the token). Login rotates the
token, so read the cookie again after signing in. Missing or wrong token: `403`.

**Envelopes.**

```jsonc
// one item
{ "data": { ... } }
// a list
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
// an error
{ "statusCode": 400, "error": "Bad Request", "message": "Validation failed",
  "details": { "issues": [ { "in": "body", "path": ["title"], "message": "title is required" } ] } }
```

| Status | Meaning                                                                     |
| ------ | --------------------------------------------------------------------------- |
| 400    | Validation failed (`details.issues`) or a bad request                       |
| 401    | Not signed in, or the session expired. The UI should go to `/login`.       |
| 403    | Signed in but not allowed (role), or missing CSRF token                     |
| 404    | Not found                                                                   |
| 409    | Duplicate slug/email, or the record is still in use                         |
| 413    | Upload too large                                                            |
| 415    | Upload type not allowed                                                     |
| 429    | Too many login attempts (`Retry-After` header)                              |

**Pagination.** List endpoints take `page` (default 1) and `pageSize` (default 20, max 100), and
most take `search`.

**Roles.**

| Role   | Can                                                                                 |
| ------ | ----------------------------------------------------------------------------------- |
| admin  | Everything, including users and settings                                            |
| editor | All posts and pages, publishing, categories, tags, all media                        |
| author | Own posts only, as drafts (cannot publish); read categories/tags; upload media, delete own media |

## Types

```ts
type Role = 'admin' | 'editor' | 'author';
type Status = 'draft' | 'published' | 'archived';

interface AuthUser { id: number; email: string; name: string; role: Role }

interface Media {
  id: number; url: string; originalName: string; mimeType: string; size: number; alt: string;
  createdAt: string; uploadedBy: { id: number; name: string } | null;
}

interface CategoryRef { id: number; name: string; slug: string }
interface TagRef { id: number; name: string; slug: string }

interface PostSummary {
  id: number; title: string; slug: string; excerpt: string; status: Status;
  publishedAt: string | null; createdAt: string; updatedAt: string;
  author: { id: number; name: string };
  category: CategoryRef | null; tags: TagRef[]; featuredImage: Media | null;
}
interface Post extends PostSummary { content: string } // sanitized HTML

interface Page {
  id: number; title: string; slug: string; content: string; status: Status;
  seoTitle: string; seoDescription: string; publishedAt: string | null;
  createdAt: string; updatedAt: string; author: { id: number; name: string } | null;
}
type PageSummary = Omit<Page, 'content'>;

interface Category { id: number; name: string; slug: string; description: string; postCount: number; createdAt: string; updatedAt: string }
interface Tag { id: number; name: string; slug: string; postCount: number; createdAt: string; updatedAt: string }

interface User {
  id: number; email: string; name: string; role: Role; isActive: boolean;
  lastLoginAt: string | null; createdAt: string; updatedAt: string;
}

interface Settings {
  siteName: string; siteDescription: string; siteUrl: string;
  logoId: number | null; faviconId: number | null;
  logoUrl: string | null; faviconUrl: string | null; // resolved from media, read-only
  defaultSeoTitle: string; defaultSeoDescription: string; postsPerPage: number;
}
```

## Auth

| Method | Path                 | Body                               | Response                    |
| ------ | -------------------- | ---------------------------------- | --------------------------- |
| GET    | `/api/auth/csrf`     |                                    | `{ data: { csrfToken } }`   |
| POST   | `/api/auth/login`    | `{ email, password }`              | `{ data: AuthUser }`, sets the cookies |
| POST   | `/api/auth/logout`   |                                    | `204`, clears the session   |
| GET    | `/api/auth/me`       |                                    | `{ data: AuthUser }` or 401 |
| POST   | `/api/auth/password` | `{ currentPassword, newPassword }` | `204`                       |

Passwords are at least 10 characters.

## Dashboard

`GET /api/dashboard` (any role)

```ts
{ data: {
  stats: { totalPosts, publishedPosts, draftPosts, archivedPosts, totalPages, totalUsers,
           totalCategories, totalTags, totalMedia }, // numbers
  recentPosts: PostSummary[];        // 5 newest by createdAt
  recentlyUpdated: PostSummary[];    // 5 most recently updated
  recentPages: PageSummary[];        // 5 most recently updated
  postsPerMonth: { month: string /* '2026-06' */; count: number }[]; // published, last 6 months, oldest first
} }
```

## Posts

| Method | Path                       | Notes                                                       |
| ------ | -------------------------- | ----------------------------------------------------------- |
| GET    | `/api/posts`               | Query: `page, pageSize, search, status, categoryId, tagId, authorId, sort (createdAt\|updatedAt\|publishedAt\|title), order (asc\|desc)`. Returns `PostSummary[]`. Authors only see their own. |
| GET    | `/api/posts/:id`           | `{ data: Post }`                                            |
| POST   | `/api/posts`               | Body below. `201 { data: Post }`                            |
| PATCH  | `/api/posts/:id`           | Any subset of the body. `{ data: Post }`                    |
| POST   | `/api/posts/:id/publish`   | Sets `published` (and `publishedAt` if empty). Editor/admin. |
| POST   | `/api/posts/:id/unpublish` | Back to `draft`. Editor/admin.                              |
| DELETE | `/api/posts/:id`           | `204`                                                       |

Body: `{ title: string; slug?: string; excerpt?: string; content?: string /* HTML */;
status?: Status; categoryId?: number | null; tagIds?: number[]; featuredImageId?: number | null;
publishedAt?: string | null }`. An empty or missing `slug` is generated from the title. The server
sanitizes `content`. Authors get `403` for any status other than `draft`.

## Pages (editor/admin)

| Method | Path                       | Notes                                                     |
| ------ | -------------------------- | --------------------------------------------------------- |
| GET    | `/api/pages`               | Query: `page, pageSize, search, status`. `PageSummary[]`  |
| GET    | `/api/pages/:id`           | `{ data: Page }`                                          |
| POST   | `/api/pages`               | `{ title, slug?, content?, status?, seoTitle?, seoDescription? }` |
| PATCH  | `/api/pages/:id`           | Any subset                                                |
| POST   | `/api/pages/:id/publish`   |                                                           |
| POST   | `/api/pages/:id/unpublish` |                                                           |
| DELETE | `/api/pages/:id`           | `204`                                                     |

## Categories and tags

| Method | Path                  | Notes                                                     |
| ------ | --------------------- | --------------------------------------------------------- |
| GET    | `/api/categories`     | Query: `page, pageSize, search`. `Category[]`. Any role.  |
| POST   | `/api/categories`     | `{ name, slug?, description? }`. Editor/admin.            |
| PATCH  | `/api/categories/:id` | Any subset. Editor/admin.                                 |
| DELETE | `/api/categories/:id` | `204`; its posts become uncategorized. Editor/admin.      |
| GET    | `/api/tags`           | Query: `page, pageSize, search`. `Tag[]`. Any role.       |
| POST   | `/api/tags`           | `{ name, slug? }`. Editor/admin.                          |
| PATCH  | `/api/tags/:id`       |                                                           |
| DELETE | `/api/tags/:id`       | `204`                                                     |

## Media

| Method | Path               | Notes                                                                 |
| ------ | ------------------ | --------------------------------------------------------------------- |
| GET    | `/api/media`       | Query: `page, pageSize, search`. `Media[]`, newest first.             |
| GET    | `/api/media/limits`| `{ data: { maxSize: number; accept: string[] } }`                     |
| POST   | `/api/media`       | `multipart/form-data` with `file` (one image) and optional `alt`. `201 { data: Media }`. PNG, JPEG, GIF, WebP only; the bytes are checked, not just the type. |
| PATCH  | `/api/media/:id`   | `{ alt }`                                                             |
| DELETE | `/api/media/:id`   | `204`. Authors may delete only their own uploads.                     |

Files are served from `GET /uploads/<key>` (proxied by Vite in development). `Media.url` is that
path, prefixed with `PUBLIC_URL` when it is set.

## Users (admin)

| Method | Path                      | Notes                                                              |
| ------ | ------------------------- | ------------------------------------------------------------------ |
| GET    | `/api/users`              | Query: `page, pageSize, search, role, status (active\|inactive)`   |
| GET    | `/api/users/:id`          | `{ data: User }`                                                   |
| POST   | `/api/users`              | `{ email, name, role, password, isActive? }`. `201`                |
| PATCH  | `/api/users/:id`          | `{ email?, name?, role?, isActive? }`. Admins cannot deactivate or demote themselves. |
| POST   | `/api/users/:id/password` | `{ password }`. `204`; ends that user's sessions.                  |

## Settings

| Method | Path            | Notes                                         |
| ------ | --------------- | --------------------------------------------- |
| GET    | `/api/settings` | `{ data: Settings }`. Any role.               |
| PUT    | `/api/settings` | Any subset of the editable fields. Admin.     |

## Public API (no auth, read-only, CORS `*`)

Only published content. No emails, no ids of users, no drafts.

| Method | Path                       | Notes                                                                    |
| ------ | -------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/public/posts`        | Query: `page, pageSize (default: postsPerPage setting), search, category (slug), tag (slug)` |
| GET    | `/api/public/posts/:slug`  | Post with `content`                                                      |
| GET    | `/api/public/pages/:slug`  |                                                                          |
| GET    | `/api/public/categories`   | Categories with published `postCount`                                    |
| GET    | `/api/public/tags`         |                                                                          |
| GET    | `/api/public/settings`     | Site name, description, URL, logo/favicon URLs, SEO defaults, postsPerPage |

```ts
interface PublicPostSummary {
  title: string; slug: string; excerpt: string; publishedAt: string; updatedAt: string;
  author: { name: string }; category: { name: string; slug: string } | null;
  tags: { name: string; slug: string }[]; featuredImage: { url: string; alt: string } | null;
}
interface PublicPost extends PublicPostSummary { content: string }
interface PublicPage { title: string; slug: string; content: string; seoTitle: string;
  seoDescription: string; publishedAt: string; updatedAt: string }
```
