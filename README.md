# Lily's Safe Haven for Cancer

A complete, self-hosted e-commerce platform for the Lily's Safe Haven cancer charity —
storefront, admin portal, customer accounts, and a REST API for the future Expo mobile app.
Built with Next.js 16, TypeScript, Tailwind CSS 4, Prisma, and PostgreSQL.

**Design:** "The Garden Press" — a keepsake botanical-press aesthetic. Deep conservatory
green ink on blush paper, prices set in mono like a keepsake receipt, and a signature
*care ledger*: every price on the site shows the real help it funds
("funds 1 care kit for a patient in treatment"), driven by a configurable impact unit.

## What's inside

**Storefront** — home, shop with search/filters/sort, product pages with variants +
reviews + wishlist, collections, cart, single-page checkout (discount codes, donation
round-up, Stripe or test payment), keepsake order receipts, guest order tracking,
stories (blog), about/FAQ/legal CMS pages, contact form, direct-donation page,
newsletter signup, live "raised so far" counter.

**Customer accounts** — registration/login (local database), order history with
timelines, address book, wishlist, profile + password management, password reset
(when SMTP is configured).

**Admin portal** (`/admin`) — dashboard with revenue chart + low-stock/attention
queues, product CRUD (variants, images, SEO, collections), collection CRUD, media
library, order management (status flow, tracking, cancel/refund with restock,
internal notes), customers, discount codes, review moderation, stories/pages CMS,
contact inbox, newsletter subscribers + CSV export, store settings (logo upload,
company info, hero, shipping/tax, impact unit), staff role management.

**REST API** (`/api/v1`) — bearer-token auth, products, collections, cart (guest
token flow), orders, wishlist, store meta. Written for the future Expo app;
see [docs/API.md](docs/API.md).

## Deploy on Coolify

1. **Create the database.** In Coolify: *Resources → PostgreSQL* (any recent version).
   Note its internal connection URL, e.g.
   `postgresql://postgres:<password>@<service-name>:5432/postgres`.

2. **Create the app.** *Resources → Application → Public Repository* →
   `https://github.com/kanippah/lilyssafehavenforcancer` (branch `main`).
   Build pack: **Dockerfile** (auto-detected). Port: **3000**.

3. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Postgres URL from step 1 |
   | `AUTH_SECRET` | long random string (`openssl rand -base64 48`) |
   | `NEXT_PUBLIC_SITE_URL` | `https://lilyssafehavenforcancer.com` |
   | `ADMIN_EMAIL` | your admin login email |
   | `ADMIN_PASSWORD` | your admin password (change after first login) |
   | `ADMIN_NAME` | display name |
   | `SEED_SAMPLE_DATA` | `true` for the demo catalog, `false` for an empty store |
   | `STRIPE_SECRET_KEY` | *(optional)* enables card checkout |
   | `STRIPE_WEBHOOK_SECRET` | *(optional)* webhook signing secret for `/api/webhooks/stripe` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | *(optional)* order + reset emails |

4. **Storage.** Nothing to do — admin-uploaded images (logo, product photos) are
   stored in PostgreSQL, so the app container is stateless and no volume is needed.
   Your images are backed up and restored with the database.

5. **Domain.** Point `lilyssafehavenforcancer.com` at the app in Coolify's domain
   settings; Coolify provisions TLS.

6. **Deploy.** On boot the container runs migrations, seeds (idempotent — creates the
   admin account and, on first boot only, the sample catalog), and starts Next.js.
   Log in at `/login` with your admin credentials → you land in `/admin`.

Without sample data, start at *Admin → Settings* (logo + company info), then
*Products* and *Collections*.

## Local development

```bash
pnpm install
cp .env.example .env        # defaults point at the local dev database
pnpm db:local               # real PostgreSQL 17 on :5433, no Docker needed
# in a second terminal:
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Storefront: http://localhost:3000 · Admin: http://localhost:3000/admin
- Seeded logins — admin: `admin@lilyssafehavenforcancer.com` / `admin1234`,
  demo customer: `customer@example.com` / `customer123`
- `pnpm db:local` refuses to run from an elevated/administrator shell
  (a PostgreSQL-on-Windows rule) — use a regular shell.

## Payments

Checkout always offers **Test payment** (no charge — orders are created as paid) so the
platform works end-to-end before Stripe is configured. Add `STRIPE_SECRET_KEY` to enable
hosted Stripe Checkout; point a Stripe webhook (`checkout.session.completed`) at
`https://lilyssafehavenforcancer.com/api/webhooks/stripe` with `STRIPE_WEBHOOK_SECRET`.

## Stack notes

- All money is stored as integer cents. Currency configurable in admin settings.
- Auth is a local-database credential system (bcrypt + signed HttpOnly JWT cookie);
  the same JWTs work as bearer tokens for `/api/v1`.
- Everything lives in PostgreSQL, including uploaded images: they are stored as
  binary columns in the media library table and served from `/uploads/…` with
  immutable cache headers. The app writes nothing to disk, so it survives
  redeploys and server rebuilds without a volume, and a database backup is a
  complete backup. Images are capped at 8 MB each (PNG, JPEG, WebP, GIF, ICO).
- The seed is idempotent and safe on every boot: it ensures settings + admin exist,
  and only creates sample data when the catalog is empty.
