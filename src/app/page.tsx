import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getPublishedPosts, getPublishedProducts } from "@/lib/queries";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [posts, products] = await Promise.all([
    getPublishedPosts(),
    getPublishedProducts(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 w-full flex-1">
        <section className="py-16 border-b border-gray-100">
          <h1 className="text-4xl font-bold tracking-tight">
            A minimalist CMS
          </h1>
          <p className="mt-3 text-gray-600 max-w-prose">
            Write blog posts and manage products from a simple admin panel.
            Deployed serverless on Vercel.
          </p>
        </section>

        <section className="py-12">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl font-semibold">Latest posts</h2>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">
              View all →
            </Link>
          </div>
          {posts.length === 0 ? (
            <p className="text-gray-500 text-sm">No posts yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {posts.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group block"
                >
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverImage}
                      alt={p.title}
                      className="aspect-[16/9] w-full object-cover rounded-lg border border-gray-100"
                    />
                  ) : null}
                  <h3 className="mt-3 font-medium group-hover:underline">
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(p.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="py-12 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl font-semibold">Featured products</h2>
            <Link href="/shop" className="text-sm text-gray-600 hover:text-gray-900">
              View all →
            </Link>
          </div>
          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">No products yet.</p>
          ) : (
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-4">
              {products.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="group block">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt={p.name}
                      className="aspect-square w-full object-cover rounded-lg border border-gray-100"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-lg bg-gray-100" />
                  )}
                  <h3 className="mt-2 text-sm font-medium group-hover:underline">
                    {p.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatPrice(p.price, p.currency)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        Built with MinCMS
      </footer>
    </>
  );
}
