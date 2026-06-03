import Link from "next/link";
import Editor from "./Editor";
import type { Post } from "@/db/schema";

export default function PostForm({
  post,
  action,
}: {
  post?: Post;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          name="title"
          defaultValue={post?.title ?? ""}
          required
          placeholder="Post title"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Slug{" "}
            <span className="font-normal text-gray-400">
              (auto from title if blank)
            </span>
          </label>
          <input
            name="slug"
            defaultValue={post?.slug ?? ""}
            placeholder="my-post"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            defaultValue={post?.status ?? "draft"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Cover image URL
        </label>
        <input
          name="coverImage"
          defaultValue={post?.coverImage ?? ""}
          placeholder="https://…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Excerpt</label>
        <textarea
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          rows={2}
          placeholder="Short summary shown in listings"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <Editor name="content" defaultValue={post?.content ?? ""} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium"
        >
          {post ? "Save changes" : "Create post"}
        </button>
        <Link
          href="/admin/posts"
          className="px-5 py-2 rounded-lg border border-gray-300 font-medium"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
