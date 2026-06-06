// Vercel serverless entry (plain JS). Registers Remix's node-tsx loader so the
// rest of the app can stay as unbundled .ts/.tsx with real module identities
// (important: island clientEntry() relies on per-file import.meta.url), then
// delegates to the TypeScript request handler.
import 'remix/node-tsx'

const { default: handler } = await import('./handler.ts')

export default handler
