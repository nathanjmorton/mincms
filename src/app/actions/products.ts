"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { toSlug } from "@/lib/utils";

async function requireAuth() {
  if (!(await isAuthed())) redirect("/admin/login");
}

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const price = parseFloat(String(formData.get("price") ?? "0")) || 0;
  const inventory =
    parseInt(String(formData.get("inventory") ?? "0"), 10) || 0;
  return {
    name,
    slug: toSlug(slugRaw || name),
    description: String(formData.get("description") ?? ""),
    price,
    currency: String(formData.get("currency") ?? "USD").trim() || "USD",
    image: String(formData.get("image") ?? "").trim(),
    inventory,
    status: (String(formData.get("status") ?? "draft") === "published"
      ? "published"
      : "draft") as "draft" | "published",
  };
}

export async function createProduct(formData: FormData) {
  await requireAuth();
  const data = parseForm(formData);
  if (!data.name) return;
  await db.insert(products).values({ ...data, updatedAt: new Date() });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function updateProduct(id: number, formData: FormData) {
  await requireAuth();
  const data = parseForm(formData);
  await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id));
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${data.slug}`);
  redirect("/admin/products");
}

export async function deleteProduct(id: number) {
  await requireAuth();
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
