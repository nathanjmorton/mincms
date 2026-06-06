import { NextRequest } from "next/server";
import {
  json,
  apiError,
  corsPreflight,
  checkReadAuth,
  checkWriteAuth,
  serializePost,
} from "@/lib/api";
import {
  getPostById,
  getPostBySlug,
  updatePostRow,
  deletePostRow,
} from "@/lib/queries";
import { toSlug } from "@/lib/utils";
import type { Post } from "@/db/schema";

export const dynamic = "force-dynamic";

async function resolve(idOrSlug: string): Promise<Post | null> {
  if (/^\d+$/.test(idOrSlug)) {
    const byId = await getPostById(Number(idOrSlug));
    if (byId) return byId;
  }
  return getPostBySlug(idOrSlug);
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
  const post = await resolve(idOrSlug);
  if (!post) return apiError(404, "Post not found");
  return json({ data: serializePost(post) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  const { idOrSlug } = await params;
  const existing = await resolve(idOrSlug);
  if (!existing) return apiError(404, "Post not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }

  const patch: Partial<Post> = {};
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.slug !== undefined) patch.slug = toSlug(String(body.slug));
  if (body.excerpt !== undefined) patch.excerpt = String(body.excerpt);
  if (body.content !== undefined) patch.content = String(body.content);
  if (body.coverImage !== undefined)
    patch.coverImage = String(body.coverImage);
  if (body.status !== undefined)
    patch.status = body.status === "published" ? "published" : "draft";

  const updated = await updatePostRow(existing.id, patch);
  if (!updated) return apiError(404, "Post not found");
  return json({ data: serializePost(updated) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  const { idOrSlug } = await params;
  const existing = await resolve(idOrSlug);
  if (!existing) return apiError(404, "Post not found");
  await deletePostRow(existing.id);
  return json({ data: { id: existing.id, deleted: true } });
}
