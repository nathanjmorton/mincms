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

**Primary: Vercel (serverless).** **Fallback: systemd (long-running).** Both run
the same source.

Remix 3 is bundler-free — in dev it compiles client assets on demand and runs
TypeScript through the `node-tsx` loader. To make that work on Vercel's serverless
runtime, [`build.mjs`](build.mjs) produces a Vercel **Build Output API v3** layout:

1. **Precompiles client assets to static files.** It drives the Remix asset
   server with a fixed `ASSET_BUILD_ID` (so content hashes are deterministic),
   crawls the *closed* set of chunks for every interactive island + the
   stylesheet, and writes them to `.vercel/output/static/assets/...` (served by
   Vercel's CDN). It also writes `asset-manifest.json` mapping each entry to its
   hashed href + preloads. At request time the function resolves hrefs from the
   manifest and **never compiles assets** (see
   [`app/utils/asset-manifest.ts`](app/utils/asset-manifest.ts)).
2. **Ships the app unbundled** as the function. The launcher
   [`api/index.mjs`](api/index.mjs) registers the `node-tsx` loader, then
   [`api/handler.ts`](api/handler.ts) adapts Node `req`/`res` ↔ Web
   `Request`/`Response` around `router.fetch()`. The server is intentionally NOT
   esbuild-bundled: islands use `clientEntry(import.meta.url, ...)`, and bundling
   would collapse every island's module identity into one URL.

Serverless-safe choices used throughout:

- **DB:** `@libsql/client/web` (pure HTTP, no native bindings) against Turso.
- **Sessions:** cookie session storage (`SESSION_SECRET`) — no server-side store,
  no writable FS needed.
- **No file uploads / no admin:** content management lives entirely in MinCMS, so
  the storefront is read-only over the API (nothing writes files).

Deploy:

```bash
vercel --prod    # uses vercel.json (buildCommand: node build.mjs, framework: null)
```

Required Vercel env vars: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`,
`MINCMS_API_URL` (optional; defaults to the live MinCMS).

### Fallback: systemd

The same code also runs as a long-running server (assets compiled live, local or
Turso DB). A sanitized unit is in
[`deploy/mincms-storefront.service`](deploy/mincms-storefront.service):

```bash
sudo cp deploy/mincms-storefront.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now mincms-storefront
journalctl -u mincms-storefront -f
```

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

- **Content management lives in MinCMS, not here.** The storefront has no admin UI
  and no file uploads — products and posts are created/edited in MinCMS and read
  over its API. The only data the storefront writes are customer accounts, carts,
  and orders (checkout), which are storefront-local.
- Product/post images are whatever URLs you set in MinCMS. (A future pass could
  move uploads to S3 presigned URLs on the MinCMS side.)
