import type { IncomingMessage, ServerResponse } from 'node:http'

import { createBookstoreRouter } from '../app/router.ts'
import { initializeBookstoreDatabase } from '../app/data/setup.ts'

// Build the router once per warm function instance.
const router = createBookstoreRouter()

// Ensure migrations + an initial catalog/blog sync have run before serving.
// Memoized inside initializeBookstoreDatabase(), so this is cheap on warm calls.
let ready: Promise<void> | null = null
function ensureReady(): Promise<void> {
  if (!ready) ready = initializeBookstoreDatabase()
  return ready
}

/** Node (req/res) -> Web Request -> router.fetch() -> Web Response -> Node res. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await ensureReady()

    let protocol = (req.headers['x-forwarded-proto'] as string) || 'https'
    let host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost'
    let url = new URL(req.url || '/', `${protocol}://${host}`)

    let headers = new Headers()
    for (let [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }

    let hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    let request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: hasBody ? (req as unknown as ReadableStream) : undefined,
      // @ts-expect-error Node streaming bodies require the duplex option.
      duplex: hasBody ? 'half' : undefined,
    })

    let response = await router.fetch(request)

    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))

    if (response.body) {
      let reader = response.body.getReader()
      for (;;) {
        let { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
      res.end()
    } else {
      res.end(await response.text())
    }
  } catch (error) {
    console.error(error)
    if (!res.headersSent) res.statusCode = 500
    res.end('Internal Server Error')
  }
}
