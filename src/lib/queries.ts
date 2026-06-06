import { db } from "@/db";
import { posts, products } from "@/db/schema";
import type { NewPost, NewProduct } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// ---------- Posts ----------
export async function getPublishedPosts() {
  return db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.createdAt));
}

export async function getAllPosts() {
  return db.select().from(posts).orderBy(desc(posts.updatedAt));
}

export async function getPostBySlug(slug: string) {
  const rows = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPostById(id: number) {
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---------- Products ----------
export async function getPublishedProducts() {
  return db
    .select()
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.createdAt));
}

export async function getAllProducts() {
  return db.select().from(products).orderBy(desc(products.updatedAt));
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProductById(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---------- Write helpers (used by the headless API) ----------
export async function insertPost(values: NewPost) {
  const rows = await db
    .insert(posts)
    .values({ ...values, updatedAt: new Date() })
    .returning();
  return rows[0];
}

export async function updatePostRow(id: number, values: Partial<NewPost>) {
  const rows = await db
    .update(posts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deletePostRow(id: number) {
  const rows = await db.delete(posts).where(eq(posts.id, id)).returning();
  return rows[0] ?? null;
}

export async function insertProduct(values: NewProduct) {
  const rows = await db
    .insert(products)
    .values({ ...values, updatedAt: new Date() })
    .returning();
  return rows[0];
}

export async function updateProductRow(
  id: number,
  values: Partial<NewProduct>
) {
  const rows = await db
    .update(products)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProductRow(id: number) {
  const rows = await db.delete(products).where(eq(products.id, id)).returning();
  return rows[0] ?? null;
}
