import { createCookie } from 'remix/cookie'
import { Session } from 'remix/session'
import { createCookieSessionStorage } from 'remix/session-storage/cookie'

/**
 * Session configuration.
 *
 * We use **cookie session storage**: all session data (just the cart + the
 * authenticated user id) lives in the signed cookie itself. This is stateless
 * and so works on serverless / read-only filesystems (Vercel) as well as the
 * long-running server, with no shared session store to provision.
 *
 * The signing secret comes from SESSION_SECRET in production; a dev fallback
 * keeps local runs zero-config.
 */
const secret = process.env.SESSION_SECRET ?? 'storefront-dev-secret-change-me'

export const sessionCookie = createCookie('session', {
  secrets: [secret],
  httpOnly: true,
  sameSite: 'Lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 2592000,
  path: '/',
})

export const sessionStorage = createCookieSessionStorage()

export { Session }
