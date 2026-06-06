import { NextRequest } from "next/server";
import {
  json,
  apiError,
  corsPreflight,
  checkReadAuth,
  checkWriteAuth,
  serializePost,
} from "@/lib/api";
import { getAllPosts, getPublishedPosts, insertPost } from "@/lib/queries";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/posts?status=published|all
export async function GET(req: NextRequest) {
  if (!checkReadAuth(req)) return apiError(401, "Unauthorized");
  const status = req.nextUrl.searchParams.get("status") ?? "published";
  const rows =
    status === "all" ? await getAllPosts() : await getPublishedPosts();
  return json({ data: rows.map(serializePost) });
}

// POST /api/posts (create) — requires write key
export async function POST(req: NextRequest) {
  if (!checkWriteAuth(req)) return apiError(401, "Unauthorized");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  const title = String(body.title ?? "").trim();
  if (!title) return apiError(422, "`title` is required");

  try {
    const created = await insertPost({
      title,
      slug: toSlug(String(body.slug ?? "") || title),
      excerpt: String(body.excerpt ?? ""),
      content: String(body.content ?? ""),
      coverImage: String(body.coverImage ?? ""),
      status: body.status === "published" ? "published" : "draft",
    });
    return json({ data: serializePost(created) }, { status: 201 });
  } catch (e) {
    return apiError(409, `Could not create post: ${(e as Error).message}`);
  }
}
