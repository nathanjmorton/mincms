import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import DeleteButton from "@/components/DeleteButton";
import { getAllPosts } from "@/lib/queries";
import { deletePost } from "@/app/actions/posts";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostsList() {
  const posts = await getAllPosts();
  return (
    <AdminShell
      title="Posts"
      action={
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
        >
          New post
        </Link>
      }
    >
      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet. Create your first one.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {posts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/posts/${p.id}`}
                  className="font-medium hover:underline truncate block"
                >
                  {p.title}
                </Link>
                <div className="text-xs text-gray-500 mt-0.5">
                  /{p.slug} · updated {formatDate(p.updatedAt)}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {p.status}
                </span>
                <Link
                  href={`/admin/posts/${p.id}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Edit
                </Link>
                <DeleteButton action={deletePost.bind(null, p.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
