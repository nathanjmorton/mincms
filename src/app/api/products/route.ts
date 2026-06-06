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
  getAllProducts,
  getPublishedProducts,
  insertProduct,
} from "@/lib/queries";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/products?status=published|all
export async function GET(req: NextRequest) {
  if (!checkReadAuth(req)) return apiError(401, "Unauthorized");
  const status = req.nextUrl.searchParams.get("status") ?? "published";
  const rows =
    status === "all" ? await getAllProducts() : await getPublishedProducts();
  return json({ data: rows.map(serializeProduct) });
}

// POST /api/products  (create) — requires write key
export async function POST(req: NextRequest) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  const name = String(body.name ?? "").trim();
  if (!name) return apiError(422, "`name` is required");

  try {
    const created = await insertProduct({
      name,
      slug: toSlug(String(body.slug ?? "") || name),
      description: String(body.description ?? ""),
      price: Number(body.price ?? 0) || 0,
      currency: String(body.currency ?? "USD"),
      image: String(body.image ?? ""),
      inventory: parseInt(String(body.inventory ?? 0), 10) || 0,
      status: body.status === "published" ? "published" : "draft",
    });
    return json({ data: serializeProduct(created) }, { status: 201 });
  } catch (e) {
    return apiError(409, `Could not create product: ${(e as Error).message}`);
  }
}
