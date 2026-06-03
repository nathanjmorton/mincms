import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getPostBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 w-full flex-1 py-12">
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to blog
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-4">{post.title}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {formatDate(post.createdAt)}
        </p>
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            className="mt-6 w-full rounded-lg border border-gray-100"
          />
        ) : null}
        <article
          className="prose prose-neutral max-w-none mt-8"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>
    </>
  );
}
