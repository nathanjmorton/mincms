"use server";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { toSlug } from "@/lib/utils";

async function requireAuth() {
  if (!(await isAuthed())) redirect("/admin/login");
}

function parseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    title,
    slug: toSlug(slugRaw || title),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? ""),
    coverImage: String(formData.get("coverImage") ?? "").trim(),
    status: (String(formData.get("status") ?? "draft") === "published"
      ? "published"
      : "draft") as "draft" | "published",
  };
}

export async function createPost(formData: FormData) {
  await requireAuth();
  const data = parseForm(formData);
  if (!data.title) return;
  await db.insert(posts).values({ ...data, updatedAt: new Date() });
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  await requireAuth();
  const data = parseForm(formData);
  await db
    .update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, id));
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  redirect("/admin/posts");
}

export async function deletePost(id: number) {
  await requireAuth();
  await db.delete(posts).where(eq(posts.id, id));
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
}
