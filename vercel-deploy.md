Everything works on both deploy paths and Git is fully synced. Let me give you the summary.

## Done — Vercel primary + systemd fallback, CMS removed

**Yes, the zigtsc/www strategy works for our storefront** — I validated it, adapted it, and **it's live on Vercel now.** Everything is pushed to GitHub (`main` in sync with origin).

### Live URLs
- **Vercel (primary):** https://storefront-nine-ashy.vercel.app
- **systemd (fallback):** port 8100 on this VM (same source, long-running)

### What I built on top of the zigtsc approach
zigtsc is an SSR-only brochure site, so it could just disable client assets and skip a DB. Our storefront is stateful and interactive, so I extended the strategy:

1. **Vercel Build Output API v3** (`build.mjs` + `api/` + `vercel.json`) — same core idea as zigtsc, but with three things it didn't need:
   - **Precompiled client assets** → static CDN files + `asset-manifest.json`. The function resolves hashed hrefs from the manifest and **never compiles assets at request time**. (Validated the chunk set is closed: 63 files, deterministic hashes.)
   - **Unbundled function** (not esbuild-bundled) so islands' `clientEntry(import.meta.url)` identities survive — bundling would collapse them. The launcher registers the `node-tsx` loader.
   - Node↔Web request adapter (like zigtsc's `api/index.ts`).
2. **Serverless-safe runtime:** `@libsql/client/web` (pure HTTP, no native bindings) against Turso; **cookie sessions** instead of filesystem.
3. **Removed all content management from the storefront** (per your ask) — deleted `app/actions/admin/**`, the admin middleware, and the entire file-upload path. Content lives in MinCMS; the storefront is read-only over the API. This also eliminated the only writable-FS dependency, so **S3 cleanly defers**.

### Three bugs I hit and fixed during the real deploy (all committed)
- Vercel **reserves `/api/*`** and 404'd it at the edge → added an explicit `/api/(.*) → function` route.
- Hashed assets kept `.tsx`/`.css` extensions → Vercel served them as `octet-stream`, blocking module execution → force `text/javascript`/`text/css` via Build Output headers.
- A `.vc-config.json` `environment` override **suppressed Vercel's project-env injection** → DB fell back to local sqlite ("unable to open database") → removed it.

### Verified end-to-end on the live Vercel deployment
Home/books/blog render from Turso; **cart island hydrates and the cookie-session cart persists** across navigation (added Ceramic Mug → "Remove from Cart" → cart page shows $18.00 total). Same flows pass on the systemd fallback.

One note: the public alias is the auto-generated `storefront-nine-ashy.vercel.app` (the Vercel project ended up named `storefront`, taking the directory name). If you want a cleaner domain (e.g. a custom domain or renamed project), say the word and I'll set it up. Want me to also start the S3 presigned-upload pass, or wire MinCMS auto-deploys for this storefront on git push?
