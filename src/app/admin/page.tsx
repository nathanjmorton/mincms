import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { getAllPosts, getAllProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [posts, products] = await Promise.all([
    getAllPosts(),
    getAllProducts(),
  ]);
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const publishedProducts = products.filter(
    (p) => p.status === "published"
  ).length;

  const cards = [
    {
      label: "Posts",
      total: posts.length,
      sub: `${publishedPosts} published`,
      href: "/admin/posts",
    },
    {
      label: "Products",
      total: products.length,
      sub: `${publishedProducts} published`,
      href: "/admin/products",
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="block rounded-xl border border-gray-200 p-6 hover:border-gray-400 transition-colors"
          >
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.total}</div>
            <div className="text-sm text-gray-500 mt-1">{c.sub}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
        >
          New post
        </Link>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
        >
          New product
        </Link>
      </div>
    </AdminShell>
  );
}
