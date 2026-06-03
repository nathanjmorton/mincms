import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const db = createClient({ url, authToken });

const now = Math.floor(Date.now() / 1000);

async function main() {
  await db.execute({
    sql: `INSERT OR IGNORE INTO posts (title, slug, excerpt, content, cover_image, status, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?)`,
    args: [
      "Welcome to MinCMS",
      "welcome-to-mincms",
      "A quick tour of your new minimalist CMS.",
      "<h2>Hello there</h2><p>This post was created to show how content flows from the admin into your public blog. Edit or delete it from the <strong>admin panel</strong>.</p><ul><li>Rich text editing</li><li>Drafts &amp; publishing</li><li>Serverless-ready</li></ul>",
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80",
      "published",
      now,
      now,
    ],
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO products (name, slug, description, price, currency, image, inventory, status, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      "Ceramic Mug",
      "ceramic-mug",
      "A handmade ceramic mug. Holds 12oz of your favorite beverage.",
      18.0,
      "USD",
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80",
      25,
      "published",
      now,
      now,
    ],
  });

  console.log("Seeded sample post and product.");
}

main().then(() => process.exit(0));
