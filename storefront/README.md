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
