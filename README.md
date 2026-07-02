# Cadcamsys Headless CMS — Backend API

Express 5 + MongoDB (Mongoose 9) headless CMS that powers:

- The **admin SPA** at `c:\Users\HC_User\Documents\CADCAM\Admin_Frontend` (React + Vite).
- A future **public Next.js site** (not built yet) at `www.cadcamsys.com`.

> Two flavours of routes:
> - **`/api/public/*`** — read-only, returns published content only.
> - **`/api/admin/*`** — full CRUD, JWT-protected, used by the admin SPA.
> Plus form-submit endpoints, sitemap/robots, and authentication.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Folder structure](#folder-structure)
4. [Architecture](#architecture)
5. [Response format](#response-format)
6. [Authentication](#authentication)
7. [List query conventions](#list-query-conventions-pagination--filtering--search)
8. [API reference — Auth](#auth)
9. [API reference — Public](#public)
10. [API reference — Forms](#forms)
11. [API reference — Admin](#admin)
12. [API reference — SEO endpoints](#seo-endpoints)
13. [API reference — Health](#health)
14. [Publish workflow](#publish-workflow)
15. [Email notifications](#email-notifications)
16. [Media uploads](#media-uploads)
17. [Docker deployment](#docker-deployment)
18. [Security notes](#security-notes)
19. [Common gotchas](#common-gotchas)

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env, set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Run
npm run dev       # watch mode, hot reload
# or
npm start         # production
```

On first boot, an **owner user** is created from `ADMIN_EMAIL` + `ADMIN_PASSWORD` if and only if the users collection is empty. Use a strong password — this is what you log in with.

API runs on `http://localhost:4000` by default.

---

## Environment variables

All values shown are defaults if absent. Anything blank in the table below has no default — it MUST be set (otherwise the server refuses to boot in production, or behaves degradedly in dev).

### Required

| Variable | Default | Notes |
|---|---|---|
| `MONGODB_URI` | — | Required. Atlas (`mongodb+srv://...`) or local (`mongodb://127.0.0.1:27017/cadcamsys`). Server refuses to start without it. |
| `JWT_SECRET` | `dev_change_me` (dev only) | In production the server refuses to boot if this is blank or `dev_change_me`. Generate with `openssl rand -hex 64`. |
| `ADMIN_EMAIL` | — | Email of the first owner created on initial boot. |
| `ADMIN_PASSWORD` | — | Password for the first owner. Must be ≥ 8 chars. |

### Server / runtime

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` in deployment. |
| `PORT` | `4000` | API listens here. |
| `JWT_EXPIRES_IN` | `7d` | JWT lifetime. |

### CORS

| Variable | Default | Notes |
|---|---|---|
| `PUBLIC_ORIGINS` | `localhost:3000,3001,5173,https://cadcamsys.com` | Comma-separated origins allowed to hit `/api/public/*` and `/api/*` form endpoints. |
| `ADMIN_ORIGINS` | `localhost:3000,3001,5173,https://admin.cadcamsys.com` | Comma-separated origins allowed to hit `/api/admin/*`. |
| `ALLOW_ANY_ORIGIN_IN_DEV` | `true` | In `NODE_ENV=development`, accept any origin. Ignored in production. |

### Cookies

| Variable | Default | Notes |
|---|---|---|
| `COOKIE_DOMAIN` | (empty) | Set to `.cadcamsys.com` if api/admin live on different subdomains and you want to share the auth cookie. Leave blank for single-host setups. |
| `COOKIE_SECURE` | `false` | Set `true` in production (HTTPS). |

### Uploads

| Variable | Default | Notes |
|---|---|---|
| `UPLOAD_DIR` | `uploads` | Local directory for media files. Mount as a Docker volume. |
| `MAX_UPLOAD_MB` | `10` | Per-file size limit. |
| `PUBLIC_BASE_URL` | `http://localhost:4000` | Used to build absolute URLs (e.g. sitemap fallback). |

### Email (transactional)

Leave `SMTP_HOST` blank to disable email — form submissions still save to the DB; only the email notification is skipped (logged once on startup).

| Variable | Default | Notes |
|---|---|---|
| `SMTP_HOST` | (empty) | e.g. `smtp.zoho.in`, `smtp.gmail.com`, `smtp.sendgrid.net`. |
| `SMTP_PORT` | `587` | 465 for implicit TLS, 587 for STARTTLS. |
| `SMTP_SECURE` | derived from port | `true` if port is 465, else `false`. |
| `SMTP_USER` | (empty) | Username (for SendGrid: literally `apikey`). |
| `SMTP_PASSWORD` | (empty) | Password or app-specific token. |
| `EMAIL_FROM` | `Cadcamsys <no-reply@cadcamsys.com>` | From address shown in admin + confirmation emails. |
| `EMAIL_ADMIN_TO` | falls back to `ADMIN_EMAIL` | Comma-separated list of recipients for lead notifications. |

### Owner bootstrap

| Variable | Default | Notes |
|---|---|---|
| `OWNER_BOOTSTRAP_KEY` | (empty) | If set, allows `/api/auth/register` to create additional owners even when users already exist. Pass via `bootstrapKey` in the body. |

---

## Folder structure

```
src/
├── app.js                     # Express app factory (middleware, routes, error handler)
├── server.js                  # Boots Mongo + creates owner + listens
├── config/
│   ├── db.js                  # Mongoose connection (with Windows DNS fix)
│   └── env.js                 # Typed env access; production safety guards
├── middlewares/
│   ├── auth.js                # JWT verify (cookie + Bearer)
│   ├── cors.js                # publicCors() + adminCors() with origin allowlists
│   ├── errorHandler.js        # central error → ApiResponse
│   └── validate.js            # Zod middleware (body/query/params)
├── models/
│   ├── User.js                # bcrypt hashing + email-as-login
│   ├── Settings.js            # singleton (siteName, logo, contact, seoDefaults...)
│   ├── Navigation.js          # singleton (header menu)
│   ├── Footer.js              # singleton (footer columns + socials)
│   ├── Media.js               # uploaded asset metadata
│   ├── Page.js                # generic CMS page (sections)
│   ├── Solution.js            # solution offerings
│   ├── ProductCategory.js
│   ├── Product.js             # hero, capabilities, downloads, FAQs, ROI metrics
│   ├── Industry.js            # vertical pages
│   ├── BlogCategory.js
│   ├── Blog.js                # editorial content
│   ├── CaseStudy.js           # challenge / solution / implementation / results
│   ├── Testimonial.js
│   ├── Tutorial.js            # videoUrl + content
│   ├── TeamMember.js
│   ├── Career.js              # job postings
│   ├── plugins/
│   │   └── publishable.js     # adds status + publishedAt + slug auto-gen
│   ├── forms/                 # lead-capture models (ContactSubmission, etc.)
│   └── index.js               # re-exports
├── schemas/                   # reusable embedded schemas
│   ├── seo.schema.js          # SEO subdocument
│   ├── faq.schema.js
│   ├── ctaSection.schema.js
│   ├── metric.schema.js
│   └── ...
├── routes/
│   ├── auth.routes.js
│   ├── forms.routes.js
│   ├── public/                # /api/public/*
│   │   ├── global.routes.js   # settings/navigation/footer/sitemap-urls
│   │   ├── pages.routes.js
│   │   ├── products.routes.js
│   │   └── ...
│   └── admin/                 # /api/admin/*
│       ├── singletons.routes.js
│       ├── media.routes.js
│       └── crud.routes.js     # mounts CRUD for every content model
├── controllers/
│   ├── auth.controller.js
│   ├── crud.controller.js     # generic list/create/get/update/delete
│   ├── forms.controller.js
│   ├── media.controller.js
│   ├── admin/
│   │   ├── singleton.controller.js
│   │   └── users.controller.js   # dedicated controller (password hashing)
│   └── public/                # one file per content type
│       └── sitemap.controller.js # sitemap.xml + robots.txt + sitemap-urls
├── services/
│   ├── auth.service.js        # signToken helper
│   ├── bootstrapAdmin.js      # first-run owner creation
│   └── email.service.js       # nodemailer wrapper (graceful no-op)
├── utils/
│   ├── apiResponse.js         # ok() / created() / fail()
│   ├── asyncHandler.js
│   └── publicList.js          # parsePublicListQuery() — pagination/filters/search
└── validations/
    ├── auth.validation.js     # Zod schemas
    ├── common.js              # objectIdParam, slugParam
    └── forms.validation.js    # Zod schemas for every form endpoint
```

---

## Architecture

- **Express 5** with `app.set("trust proxy", 1)` so `X-Forwarded-For` / `X-Forwarded-Proto` are honoured behind nginx.
- **Helmet** with `crossOriginResourcePolicy: cross-origin` so `<img src="/uploads/...">` renders from the admin SPA on a different port.
- **Compression**, **JSON body parser** (2 MB limit), **cookie-parser**, **morgan** request logging.
- **Global rate limit**: 300 req/min/IP in production, 1000 req/min in dev.
- **Auth rate limit**: stricter — 10 logins per 15 min per IP.
- **Form rate limit**: 20 submissions/min/IP on the public form endpoints.
- **Two CORS scopes**: `publicCors()` is applied to public + form + auth endpoints; `adminCors()` is applied to `/api/admin/*` together with `requireAuth`.
- **Error handling**: every route is wrapped in `asyncHandler`; errors funnel through `errorHandler.js`, which maps Zod, Mongoose, Multer, and arbitrary errors to the unified response format.

---

## Response format

Every JSON response uses the same envelope.

**Success:**
```json
{
  "success": true,
  "data": { ... } | [...],
  "meta": { "page": 1, "limit": 12, "total": 42, "pages": 4 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": { ... }
  }
}
```

Standard error codes:
- `VALIDATION_ERROR` — body/query/params failed Zod validation.
- `MONGOOSE_VALIDATION_ERROR` — model validation failed.
- `MONGOOSE_CAST_ERROR` — invalid ObjectId in path or query.
- `UNAUTHENTICATED` — missing/invalid JWT.
- `INVALID_CREDENTIALS` — wrong email/password on login.
- `REGISTRATION_DISABLED` — register attempted with users already in DB and no bootstrap key.
- `EMAIL_EXISTS` — registering an email already in use.
- `LAST_OWNER` — attempt to delete the last owner.
- `NOT_FOUND` — resource doesn't exist.
- `UPLOAD_ERROR` — multer rejected the upload (bad MIME, too large, etc.).
- `TOO_MANY_LOGINS` — login rate-limit hit.

---

## Authentication

JWT-based, dual-mode:

1. **httpOnly cookie** `token` — set on `/api/auth/login` and `/api/auth/register`. Browser sends automatically when `withCredentials: true`. Preferred for the admin SPA.
2. **Bearer header** `Authorization: Bearer <token>` — handy for curl, Postman, server-to-server.

Either is accepted on protected routes (`/api/admin/*`, `/api/auth/me`).

Cookie flags: `httpOnly`, `sameSite=lax`, `secure=COOKIE_SECURE`, optional `domain=COOKIE_DOMAIN`.

Logout clears the cookie with the same flags so it works across subdomains too.

---

## List query conventions (pagination + filtering + search)

All public list endpoints (and admin CRUD list endpoints) accept these query params:

| Param | Default | Notes |
|---|---|---|
| `page` | `1` | 1-indexed. |
| `limit` | `12` (public) / `20` (admin) | Capped at `50` (public) / `100` (admin). |
| `sort` | per-endpoint | `field` or `-field` (descending). Limited to `[a-zA-Z0-9_.]`. |
| `q` | (none) | Free-text case-insensitive regex search. Each endpoint searches a fixed set of fields (see below). |

Filter params are per-endpoint and **silently ignored** when they don't pass validation (e.g. malformed ObjectId).

Public list response includes `meta`:
```json
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 12, "total": 42, "pages": 4 } }
```

---

## Auth

### POST `/api/auth/register`
First-run owner bootstrap. Works when users collection is empty, OR `OWNER_BOOTSTRAP_KEY` is set and matches.

Body:
```json
{
  "email": "owner@cadcamsys.com",
  "password": "strongpassword",
  "name": "Owner",
  "bootstrapKey": "optional"
}
```
Returns 201 with `{ token, user }`. Sets `token` cookie.

### POST `/api/auth/login`
Rate-limited: 10/IP per 15 min.

Body:
```json
{ "email": "owner@cadcamsys.com", "password": "..." }
```
Returns 201 with `{ token, user }`. Sets `token` cookie.

### POST `/api/auth/logout`
Clears the cookie. Returns `{ loggedOut: true }`.

### GET `/api/auth/me`
Returns the current user (without `passwordHash`). Requires auth.

---

## Public

All public endpoints filter to `status: "published"`. Detail endpoints `populate` related content with `match: { status: "published" }` so unpublished relations are hidden.

### Globals
- `GET /api/public/settings` — site name, logo, favicon, contact info, social links, SEO defaults, GA id, Zoho booking URL.
- `GET /api/public/navigation` — primary header menu (singleton).
- `GET /api/public/footer` — footer columns + socials.

### Pages
- `GET /api/public/pages` — list of published pages.
- `GET /api/public/pages/:slug`

### Products
- `GET /api/public/products` — paginated.
  - Filters: `category`, `solution`, `industries` (each accepts an ObjectId).
  - Search `q`: matches `title`, `shortDescription`.
- `GET /api/public/products/:slug` — populates `category`, `solution`, `industries`, `caseStudies`, `testimonials`, `blogs`, `downloads.file`, `hero.image`, `seo.ogImage`, `seo.twitterImage`.

### Industries
- `GET /api/public/industries` — paginated. Search `q`: `title`, `headline`.
- `GET /api/public/industries/:slug` — populates `coverImage`, `solutions`, `products`, `caseStudies`, `testimonials`, `blogs`, `tutorials`, `customerLogos`, SEO images.

### Solutions
- `GET /api/public/solutions` — paginated.
  - Filters: `products`, `industries`.
  - Search `q`: `title`, `shortDescription`.
- `GET /api/public/solutions/:slug` — populates products, industries, blogs, case studies, testimonials, SEO images.

### Blogs
- `GET /api/public/blogs` — paginated.
  - Filters: `category` (ObjectId), `tag` (string).
  - Search `q`: `title`, `excerpt`.
- `GET /api/public/blogs/:slug` — populates featuredImage, category, related products/industries/solutions.

### Case studies
- `GET /api/public/case-studies` — paginated.
  - Filters: `industry`, `solutions`, `products`.
  - Search `q`: `title`, `customerName`.
- `GET /api/public/case-studies/:slug` — populates customerLogo, industry, solutions, products, testimonial.

### Testimonials
- `GET /api/public/testimonials` — paginated.
  - Filters: `industry`, `products`, `solutions`.
  - Search `q`: `customerName`, `company`, `quote`.
- `GET /api/public/testimonials/:id` — by Mongo `_id`, not slug.

### Tutorials
- `GET /api/public/tutorials` — paginated.
  - Filters: `products`, `industries`.
  - Search `q`: `title`, `content`.
- `GET /api/public/tutorials/:slug`

### Careers
- `GET /api/public/careers` — paginated.
  - Filters: `department`, `location`, `employmentType` (strings).
  - Search `q`: `title`, `description`.
- `GET /api/public/careers/:slug`

### Team members
- `GET /api/public/team-members` — sorted by `order` then `createdAt`. Populates `photo`. No pagination (small list).

### Categories
- `GET /api/public/blog-categories`
- `GET /api/public/product-categories`

---

## Forms

All form endpoints are public POST and rate-limited to 20 req/min/IP. Each runs through Zod validation and stores the submission in its own collection. If SMTP is configured, an admin notification email is sent (fire-and-forget) and a confirmation is sent back to the submitter when their email is present.

| Endpoint | Stores in | Notifies admin | Confirms to user |
|---|---|---|---|
| `POST /api/contact` | `ContactSubmission` | ✓ | ✓ |
| `POST /api/book-consultation` | `ConsultationBooking` | ✓ | ✓ |
| `POST /api/support-request` | `SupportRequest` | ✓ | ✓ |
| `POST /api/roi-request` | `ROIRequest` | ✓ | ✓ |
| `POST /api/newsletter` | `NewsletterSubscriber` | ✓ | — |
| `POST /api/job-application` | `JobApplication` | ✓ (enriched with career title) | ✓ |

Sample payloads:

```json
// /api/contact
{
  "name": "John Doe",
  "company": "Acme Pvt Ltd",
  "designation": "Manager",
  "email": "john@example.com",
  "phone": "+91-9999999999",
  "industry": "Automotive",
  "message": "I want a demo",
  "sourcePage": "/contact"
}
```

```json
// /api/book-consultation
{
  "name": "John Doe",
  "company": "Acme",
  "email": "john@example.com",
  "phone": "+91-9999999999",
  "consultationType": "Product demo",
  "preferredDate": "2026-06-01T10:00:00.000Z",
  "notes": "Call after 5 PM"
}
```

```json
// /api/support-request
{
  "customerName": "John Doe",
  "company": "Acme",
  "email": "john@example.com",
  "product": "AlmaCAM",
  "priority": "high",          // low | normal | high | urgent
  "issueDescription": "Install fails at step 3"
}
```

```json
// /api/roi-request
{
  "name": "John Doe",
  "company": "Acme",
  "email": "john@example.com",
  "currentProcess": "Manual nesting + separate CAM programming",
  "painPoints": "High scrap, longer cycle times"
}
```

```json
// /api/newsletter
{ "email": "john@example.com", "sourcePage": "/blog" }
```

```json
// /api/job-application
{
  "careerId": "<ObjectId>",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9999999999",
  "coverLetter": "I am interested in this role",
  "resumeUrl": "https://..."   // optional
}
```

---

## Admin

All `/api/admin/*` routes require auth (cookie or Bearer). Each `:id` route validates the ObjectId before hitting Mongo.

### Singletons

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/settings` | Returns the `Settings` singleton (auto-creates with defaults on first read). |
| PUT | `/api/admin/settings` | Partial update. |
| GET | `/api/admin/navigation` | |
| PUT | `/api/admin/navigation` | |
| GET | `/api/admin/footer` | |
| PUT | `/api/admin/footer` | |

### Media

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/media/upload` | `multipart/form-data` with key `file` plus optional `altText` and `caption`. MIME-allowlisted to images, PDF, MP4, WebM. Capped at `MAX_UPLOAD_MB`. |
| GET | `/api/admin/media` | Paginated, supports `q` text search across original name / alt text / caption (Mongo text index). |
| GET | `/api/admin/media/:id` | |
| DELETE | `/api/admin/media/:id` | Removes DB row + file on disk. |

```bash
curl -X POST http://localhost:4000/api/admin/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.png" \
  -F "altText=Hero image" \
  -F "caption=Homepage hero"
```

### CRUD resources

Every resource below has the same five endpoints. **Updates use `PUT` semantics** but accept partial payloads (omitted fields are preserved). The `:id` is validated as an ObjectId.

```
GET    /api/admin/{resource}            # list (page, limit, sort)
POST   /api/admin/{resource}            # create
GET    /api/admin/{resource}/:id        # detail
PUT    /api/admin/{resource}/:id        # update (partial)
DELETE /api/admin/{resource}/:id        # delete
```

Resources:

- `pages`
- `solutions`
- `product-categories`
- `products` (populates `category`, `solution`, `hero.image`, `downloads.file`)
- `industries` (populates `coverImage`)
- `blog-categories`
- `blogs` (populates `featuredImage`, `category`)
- `case-studies` (populates `customerLogo`, `industry`)
- `testimonials` (populates `photo`, `logo`)
- `tutorials` (populates `featuredImage`)
- `team-members` (populates `photo`)
- `careers`
- `leads/contact-submissions`
- `leads/consultation-bookings`
- `leads/support-requests`
- `leads/newsletter-subscribers`
- `leads/roi-requests`
- `leads/job-applications`

### Users (dedicated)

Users use a separate controller because passwords must be bcrypt-hashed and never echoed back.

| Method | Path | Body |
|---|---|---|
| GET | `/api/admin/users` | — |
| POST | `/api/admin/users` | `{ email, password, name?, role? }` |
| GET | `/api/admin/users/:id` | — |
| PUT | `/api/admin/users/:id` | `{ email?, password?, name?, role? }` — `password` rehashed if present. |
| DELETE | `/api/admin/users/:id` | Refuses to delete the last owner. |

`passwordHash` is never returned to the client.

### Example: create a Product

```http
POST /api/admin/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "AlmaCAM",
  "slug": "almacam",                 // optional — auto-generated from title if blank
  "shortDescription": "High performance CAM for sheet metal",
  "category": "<ProductCategory ObjectId>",
  "solution": "<Solution ObjectId>",
  "industries": ["<Industry ObjectId>"],
  "hero": {
    "headline": "Engineer smarter",
    "subheadline": "...",
    "image": "<Media ObjectId>"
  },
  "whyChoose": ["Fast nesting", "Tight tolerances"],
  "capabilities": ["2.5D milling", "Drilling"],
  "downloads": [
    { "title": "Datasheet", "file": "<Media ObjectId>" }
  ],
  "status": "draft",
  "seo": { "metaTitle": "AlmaCAM", "metaDescription": "..." }
}
```

### Publish a draft

```http
PUT /api/admin/products/:id
{ "status": "published" }
```
This also stamps `publishedAt = now` via the publishable plugin.

---

## SEO endpoints

Three SEO-related endpoints serve the future Next.js site and search engines:

| Method | Path | Returns |
|---|---|---|
| GET | `/sitemap.xml` | XML sitemap. Walks every publishable model, filters by `status=published` + `seo.includeInSitemap !== false`. Uses each entry's `seo.changeFrequency` and `seo.sitemapPriority`. URL prefix per content type is configured in `sitemap.controller.js`. Site URL comes from `Settings.siteUrl` (falls back to `PUBLIC_BASE_URL`). Cached 1 hour. |
| GET | `/robots.txt` | Plain text. References `/sitemap.xml`, blocks `/api/admin/`. |
| GET | `/api/public/sitemap-urls` | Same data as `/sitemap.xml` but as JSON, for the Next.js site to build its own sitemap. |

---

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status: "ok", uptime: <seconds> }`. Used by the Docker healthcheck and reverse proxy. No auth, no CORS restriction. |

---

## Publish workflow

Major content models include the **publishable plugin**, which adds:

- `status: "draft" | "published"` (default `draft`, indexed)
- `publishedAt: Date | null` (set automatically when `status` flips to `published`, cleared when flipped back to `draft`)
- An auto-slug pre-save hook: if `slug` is empty on save and `title` is set, generates a URL-safe slug.

Public endpoints filter to `status: "published"`. Admin endpoints return everything. The admin SPA exposes Draft / Publish buttons on each form.

---

## Email notifications

`src/services/email.service.js` wraps nodemailer with a graceful no-op when `SMTP_HOST` is unset. Form controllers call `notifyAdminLead({ kind, fields, replyTo })` and `sendLeadConfirmation({ to, kind, name })` as fire-and-forget after `Model.create(...)`. Failures are logged but do not break the API response.

To enable email:

1. Pick an SMTP provider (Zoho Mail, SendGrid, Gmail SMTP with App Password, Mailgun, AWS SES, etc.).
2. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_ADMIN_TO` in `.env`.
3. Restart the API.

To customise the email body, edit `notifyAdminLead`/`sendLeadConfirmation` in `email.service.js`.

---

## Media uploads

- Stored on the local disk at `UPLOAD_DIR` (default `./uploads`). In Docker, mounted as a named volume so it survives container rebuilds.
- Served statically at `GET /uploads/<filename>`.
- MIME allowlist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `image/avif`, `application/pdf`, `video/mp4`, `video/webm`.
- Extension allowlist enforced separately (defense in depth).
- Per-file size limit from `MAX_UPLOAD_MB` (default 10 MB).
- Filename is randomized (`<timestamp>-<random>.<ext>`) — original name preserved on the `Media.originalName` field for search.

To switch to S3 / Cloudinary later, replace the `storage` config in `src/routes/admin/media.routes.js` and the `Media.url` builder in `media.controller.js`.

---

## Docker deployment

The compose file at the project root (`docker-compose.yml`) brings up the backend + admin SPA + (optionally) MongoDB:

```bash
# Default (uses MongoDB Atlas; reads MONGODB_URI from .env)
docker compose up -d --build

# With local MongoDB container instead of Atlas
docker compose --profile local-db up -d --build
# then set in .env:
# MONGODB_URI=mongodb://mongo:27017/cadcamsys
```

Services:

| Service | Image / build | Port | Notes |
|---|---|---|---|
| `mongo` | `mongo:7` (profile `local-db`) | internal only | Persisted to `mongo_data` volume. |
| `backend` | builds from `./Dockerfile` | `4000:4000` | Reads `.env`. Uploads on `uploads` volume. |
| `admin` | builds from `../Admin_Frontend/Dockerfile` | `8080:80` | nginx serving the Vite build; reverse-proxies `/api/` and `/uploads/` to `backend`. |

Healthcheck: backend container hits `/health` every 30 s.

---

## Security notes

- ✅ Hardcoded credentials removed from `db.js` (was a previous bug).
- ✅ Production refuses to start with default/missing `JWT_SECRET`.
- ✅ httpOnly cookies + secure flag + sameSite=lax.
- ✅ Helmet, rate limiting (global, auth, forms).
- ✅ Multer file-type + size validation + sanitized filenames.
- ✅ ObjectId validation on every `:id` admin route.
- ✅ Zod validation on every form endpoint.
- ✅ Last-owner protection (can't delete the only admin).

### Things to add for a hardened production deploy

- [ ] HTML sanitization (e.g. `sanitize-html`) on rich-text fields before saving — only matters when the Next.js site renders content via `dangerouslySetInnerHTML`.
- [ ] HTTPS-only redirect behind nginx (or a `req.headers["x-forwarded-proto"]` check).
- [ ] Centralised structured logging (Pino) + an error sink (Sentry).
- [ ] Per-resource audit log (who edited what, when). Not built — discussed for phase 2.
- [ ] Background backups (Atlas does this automatically on most tiers).

---

## Common gotchas

**`querySrv ECONNREFUSED` on Windows when connecting to Atlas.**
`src/config/db.js` sets `dns.setServers(["8.8.8.8", "8.8.4.4"])` to work around blocked SRV lookups on some Windows networks. Harmless on Linux.

**Admin gets 401 on every request after rebuild.**
The JWT secret changed between builds — old tokens are now invalid. Log out and log back in.

**Admin can't reach the API in Docker.**
Check that `VITE_API_BASE_URL` was set at admin build time. Default is `/api`, which means the admin's nginx must proxy `/api/` to the backend container. The included nginx.conf already does this.

**`crossOriginResourcePolicy` errors on uploaded images.**
Helmet is configured to `cross-origin` already. If you customise it, make sure media served from `/uploads/*` stays cross-origin so it renders in the admin SPA on a different host.

**MongoDB Atlas IP allowlist blocking the VPS.**
Add the VPS's outbound IP to your Atlas project's network access list (or `0.0.0.0/0` for dev).
