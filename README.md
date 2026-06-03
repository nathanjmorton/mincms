# MinCMS

A minimalist, WordPress-like CMS for **blog posts** and **e-commerce products**,
built to deploy serverless on **Vercel**.

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS
- **Drizzle ORM** over **libSQL/SQLite** — a local file in dev, [Turso](https://turso.tech) in production
- **TipTap** rich-text editor for a familiar, WordPress-style writing experience
- Cookie/JWT auth with a single admin password
- Public blog + shop, protected `/admin` panel with full CRUD

## Quick start (local)

```bash
npm install
cp .env.example .env        # then edit values
npm run db:migrate          # create tables in local.db
npm run db:seed             # optional: sample post + product
npm run dev                 # http://localhost:3000
```

Sign in at `/admin` using the `ADMIN_PASSWORD` from your `.env` (default `admin`).

## Environment variables

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | libSQL connection. `file:local.db` locally, `libsql://...` for Turso | `file:local.db` |
| `DATABASE_AUTH_TOKEN` | Turso auth token (prod only) | — |
| `AUTH_SECRET` | Secret used to sign session JWTs. Use a long random string | dev fallback |
| `ADMIN_PASSWORD` | Plaintext admin password (simple setup) | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password (overrides `ADMIN_PASSWORD`) | — |

Generate a secret: `openssl rand -base64 32`

Generate a bcrypt hash:
`node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" 'your-password'`

## Deploy to Vercel

Vercel is serverless, so it needs a hosted database. This project uses **Turso**
(serverless libSQL) — the same SQLite engine as local dev.

1. **Create a Turso database** ([turso.tech](https://turso.tech)):
   ```bash
   turso db create mincms
   turso db show mincms --url            # -> DATABASE_URL
   turso db tokens create mincms         # -> DATABASE_AUTH_TOKEN
   ```
2. **Apply migrations** to it:
   ```bash
   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:migrate
   ```
3. **Push to GitHub and import the repo in Vercel.**
4. In the Vercel project, set env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`,
   `AUTH_SECRET`, and `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`).
5. Deploy. The admin panel lives at `https://your-app.vercel.app/admin`.

## Project structure

```
src/
  app/
    page.tsx              Home (latest posts + featured products)
    blog/                 Public blog index + post pages
    shop/                 Public shop index + product pages
    admin/                Protected CMS (dashboard, posts, products)
    actions/              Server actions (auth, posts, products)
  components/             Editor, forms, admin shell/nav
  db/                     Drizzle schema + client
  lib/                    auth, queries, utils
  proxy.ts                Route protection for /admin
drizzle/                  Generated SQL migrations
scripts/seed.mjs          Sample data
```

## Notes & next steps

- **Images** are stored as URLs (portable). To support uploads, add
  [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) and swap the URL
  fields for an upload widget.
- **Checkout** on product pages is a stub. Wire up
  [Stripe Checkout](https://stripe.com/docs/checkout) to sell for real.
- Auth is a single shared admin password. For multiple users, add a `users`
  table and per-user sessions.
