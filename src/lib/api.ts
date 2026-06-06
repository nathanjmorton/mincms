import { NextRequest, NextResponse } from "next/server";
import type { Post, Product } from "@/db/schema";

// ---------------------------------------------------------------------------
// Headless JSON API helpers: CORS, API-key auth, and response serializers.
// External storefronts consume these endpoints to read the catalog/blog.
// ---------------------------------------------------------------------------

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.API_CORS_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function json(data: unknown, init: ResponseInit = {}) {
  return NextResponse.json(data as object, {
    ...init,
    headers: { ...corsHeaders, ...(init.headers ?? {}) },
  });
}

export function apiError(status: number, message: string) {
  return json({ error: message }, { status });
}

/**
 * Read access: if API_READ_KEY is unset, reads are public (typical for a
 * storefront catalog). If set, callers must present it. Write access always
 * requires API_WRITE_KEY.
 */
export function checkReadAuth(req: NextRequest): boolean {
  const required = process.env.API_READ_KEY;
  if (!required) return true;
  return bearer(req) === required;
}

export function checkWriteAuth(req: NextRequest): boolean {
  const required = process.env.API_WRITE_KEY;
  // If no write key is configured, writes are disabled (safe default).
  if (!required) return false;
  return bearer(req) === required;
}

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  // Also accept x-api-key for convenience.
  return req.headers.get("x-api-key");
}

// ---- Serializers: stable public shape, independent of DB columns ----

export function serializeProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    currency: p.currency,
    image: p.image,
    inventory: p.inventory,
    inStock: p.inventory > 0,
    status: p.status,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

export function serializePost(p: Post) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    status: p.status,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}
