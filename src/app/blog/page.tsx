import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getPublishedPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blog — MinCMS" };

export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 w-full flex-1 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Blog</h1>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts published yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((p) => (
              <article key={p.id} className="py-6">
                <Link href={`/blog/${p.slug}`} className="group">
                  <h2 className="text-xl font-semibold group-hover:underline">
                    {p.title}
                  </h2>
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(p.createdAt)}
                </p>
                {p.excerpt ? (
                  <p className="mt-2 text-gray-600">{p.excerpt}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
