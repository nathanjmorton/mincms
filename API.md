# MinCMS Headless API

Manage content in the MinCMS admin (`/admin`); consume it from any external
site (a Remix/Next storefront, mobile app, etc.) over HTTP JSON.

Base URL: `https://mincms-ten.vercel.app/api`

## Authentication

| Access | Header | Env var | Default |
| --- | --- | --- | --- |
| **Read** | `Authorization: Bearer <API_READ_KEY>` | `API_READ_KEY` | unset → **public** |
| **Write** | `Authorization: Bearer <API_WRITE_KEY>` | `API_WRITE_KEY` | unset → **writes disabled** |

- Leave `API_READ_KEY` unset for a public catalog (typical storefront). Set it
  to require a key on reads too.
- `x-api-key: <key>` is accepted as an alternative to the `Authorization` header.
- CORS: allows `*` by default; set `API_CORS_ORIGIN` to lock it to your
  storefront's origin for browser-side fetches.

## Endpoints

### Products
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/products?status=published\|all` | read | `published` (default) or `all` |
| GET | `/api/products/:idOrSlug` | read | numeric id or slug |
| POST | `/api/products` | write | create |
| PUT | `/api/products/:idOrSlug` | write | partial update |
| DELETE | `/api/products/:idOrSlug` | write | delete |

### Posts
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/posts?status=published\|all` | read | |
| GET | `/api/posts/:idOrSlug` | read | |
| POST | `/api/posts` | write | create |
| PUT | `/api/posts/:idOrSlug` | write | partial update |
| DELETE | `/api/posts/:idOrSlug` | write | delete |

Responses are wrapped: `{ "data": ... }`; errors are `{ "error": "message" }`.

## Shapes

**Product**
```json
{
  "id": 2, "name": "Ceramic Mug", "slug": "ceramic-mug",
  "description": "...", "price": 18, "currency": "USD",
  "image": "https://...", "inventory": 25, "inStock": true,
  "status": "published",
  "createdAt": "2026-06-03T23:24:18.000Z", "updatedAt": "..."
}
```

**Post**
```json
{
  "id": 3, "title": "My First Real Post", "slug": "my-first-real-post",
  "excerpt": "...", "content": "<p>HTML from the editor</p>",
  "coverImage": "", "status": "published",
  "createdAt": "...", "updatedAt": "..."
}
```

## Examples

Read the catalog (public):
```bash
curl https://mincms-ten.vercel.app/api/products
```

Consume from a storefront (server-side fetch):
```ts
// e.g. a Remix loader
export async function loader() {
  const res = await fetch("https://mincms-ten.vercel.app/api/products", {
    headers: process.env.MINCMS_READ_KEY
      ? { Authorization: `Bearer ${process.env.MINCMS_READ_KEY}` }
      : {},
  });
  const { data } = await res.json();
  return { products: data };
}
```

Create a product from an external system (write key required):
```bash
curl -X POST https://mincms-ten.vercel.app/api/products \
  -H "Authorization: Bearer $MINCMS_WRITE_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"New Mug","price":18,"inventory":50,"status":"published"}'
```
