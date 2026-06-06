import { NextRequest } from "next/server";
import {
  json,
  apiError,
  corsPreflight,
  checkReadAuth,
  checkWriteAuth,
  serializeProduct,
} from "@/lib/api";
import {
  getProductById,
  getProductBySlug,
  updateProductRow,
  deleteProductRow,
} from "@/lib/queries";
import { toSlug } from "@/lib/utils";
import type { Product } from "@/db/schema";

export const dynamic = "force-dynamic";

async function resolve(idOrSlug: string): Promise<Product | null> {
  if (/^\d+$/.test(idOrSlug)) {
    const byId = await getProductById(Number(idOrSlug));
    if (byId) return byId;
  }
  return getProductBySlug(idOrSlug);
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  if (!checkReadAuth(req)) return apiError(401, "Unauthorized");
  const { idOrSlug } = await params;
  const product = await resolve(idOrSlug);
  if (!product) return apiError(404, "Product not found");
  return json({ data: serializeProduct(product) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  const { idOrSlug } = await params;
  const existing = await resolve(idOrSlug);
  if (!existing) return apiError(404, "Product not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }

  const patch: Partial<Product> = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.slug !== undefined) patch.slug = toSlug(String(body.slug));
  if (body.description !== undefined)
    patch.description = String(body.description);
  if (body.price !== undefined) patch.price = Number(body.price) || 0;
  if (body.currency !== undefined) patch.currency = String(body.currency);
  if (body.image !== undefined) patch.image = String(body.image);
  if (body.inventory !== undefined)
    patch.inventory = parseInt(String(body.inventory), 10) || 0;
  if (body.status !== undefined)
    patch.status = body.status === "published" ? "published" : "draft";

  const updated = await updateProductRow(existing.id, patch);
  if (!updated) return apiError(404, "Product not found");
  return json({ data: serializeProduct(updated) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  const { idOrSlug } = await params;
  const existing = await resolve(idOrSlug);
  if (!existing) return apiError(404, "Product not found");
  await deleteProductRow(existing.id);
  return json({ data: { id: existing.id, deleted: true } });
}
