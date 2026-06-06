# MinCMS Storefront

A Remix 3 e-commerce storefront that consumes the **MinCMS headless API** for its
product catalog. It is adapted from the official
[Remix bookstore demo](https://github.com/remix-run/remix/tree/main/demos/bookstore)
and rewired so the catalog is owned by MinCMS instead of a local seed.

## How the catalog works (API + local DB fallback)

The storefront keeps the demo's full e-commerce machinery (cart, checkout, auth,
orders, admin) running on a local SQLite database, but the **product catalog is
synced from MinCMS**:

```
MinCMS  ──GET /api/products?status=published──►  catalog sync  ──►  SQLite `books`  ──►  UI / cart / search
(source of truth)                                (throttled)        (cache + fallback)
```

- On startup (and when the cache is empty) the app does a **blocking** sync so the
  first render has products.
- On subsequent requests it refreshes the cache **in the background**, throttled to
  one API round-trip per `MINCMS_REFRESH_MS` (default 30s).
- If MinCMS is **unreachable**, the sync logs a warning and the app keeps serving
  the **last known catalog from SQLite** — the local DB is a live cache *and* an
  offline backup. The cache is only pruned on a *successful* fetch, so it is never
  emptied while the API is down.

Each MinCMS product is mapped onto the storefront's `books` row shape in
[`app/data/catalog.ts`](app/data/catalog.ts):

| MinCMS product | Storefront book |
| --- | --- |
| `name` | `title` |
| `slug` | `slug` |
| `description` | `description` |
| `price` | `price` |
| `image` | `cover_url` / `image_urls` |
| `inStock` | `in_stock` |
| `currency` | `genre` (so genre-browse keeps working) |
| `id` | `id`, `isbn` = `MINCMS-<id>` |

All existing UI, cart, search and order code reads from `books` and is unaware of
the source — the integration is isolated to `app/data/catalog.ts`,
`app/data/setup.ts`, and `app/middleware/database.ts`.

The blog works the same way: MinCMS `/api/posts` → a `posts` cache table →
`/blog` and `/blog/:slug` (see `app/actions/blog/`).

## Database (local SQLite vs Turso)

The app picks its driver at startup:

- **`DATABASE_URL` set** → Turso / libSQL via a custom async adapter
  ([`app/data/turso-adapter.ts`](app/data/turso-adapter.ts)). The framework's
  built-in SQLite adapter only accepts a *synchronous* driver, so this adapter
  implements the async `DatabaseAdapter` contract directly while reusing the
  framework's SQLite SQL compiler — generated SQL stays identical to local dev.
  Supports transactions and savepoints (used by checkout).
- **otherwise** → local file-backed `node:sqlite` at `db/bookstore.sqlite`.

Migrations in `db/migrations/` run on startup against whichever driver is active.

Provision a Turso DB:

```bash
turso db create mincms-storefront
turso db show mincms-storefront --url            # -> DATABASE_URL
turso db tokens create mincms-storefront         # -> DATABASE_AUTH_TOKEN
```

## Deploying

Remix 3 is bundler-free and runs a **long-running Node server** (it compiles
client assets on demand and uses the `--import remix/node-tsx` loader). The
natural deploy target is therefore a persistent Node process, not a serverless
function.

This instance runs on the VM under **systemd**, backed by Turso, on port 8100.
A sanitized unit file is in [`deploy/mincms-storefront.service`](deploy/mincms-storefront.service):

```bash
sudo cp deploy/mincms-storefront.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now mincms-storefront
systemctl status mincms-storefront
journalctl -u mincms-storefront -f
```

Provide env via an `EnvironmentFile` (see `.env.example` for the keys:
`NODE_ENV`, `PORT`, `MINCMS_API_URL`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`).

> Vercel / serverless note: this framework fits serverless poorly — no build
> step, on-demand asset compilation with native binaries, a read-only FS (sessions
> and uploads expect a writable filesystem), and no `--import` loader flag on the
> function runtime. A long-running server (systemd, a container, Fly.io, Railway,
> Render, etc.) is the supported path.

## Running

Requires Node >= 24.3 (uses `node:sqlite` and Remix 3's `node-tsx` loader).

```bash
npm install
cp .env.example .env   # optional; defaults point at the live MinCMS
npm start              # http://localhost:44100
# or: npm run dev      # watch mode
```

Configure the upstream via env vars (see `.env.example`):

- `MINCMS_API_URL` — base URL of the MinCMS instance (default `https://mincms-ten.vercel.app`)
- `MINCMS_REFRESH_MS`, `MINCMS_TIMEOUT_MS` — cache refresh cadence / fetch timeout

### Demo accounts (local auth, unrelated to MinCMS)

- Admin: `admin@bookstore.com` / `admin123`
- Customer: `customer@example.com` / `password123`

## Stack

- **Remix 3** (beta, `remix@next` from npm) — full-stack framework: router,
  `data-table` ORM over `node:sqlite`, server-rendered `remix/ui`, sessions, auth,
  middleware, asset pipeline. No bundler/Vite; TypeScript is run directly via
  `--import remix/node-tsx`.
- **MinCMS** headless JSON API for the catalog.

## Notes / limitations

- Writes (admin "books" CRUD, checkout, orders) persist to the **local SQLite**,
  not back to MinCMS. To make MinCMS the write target too, point those controllers
  at `POST/PUT/DELETE /api/products` using `MINCMS_API_KEY`. Catalog is currently
  read-from-MinCMS, write-locally.
- Product images are whatever URLs you set in MinCMS.
