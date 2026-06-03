import { notFound } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import PostForm from "@/components/PostForm";
import { getPostById } from "@/lib/queries";
import { updatePost } from "@/app/actions/posts";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(Number(id));
  if (!post) notFound();

  const action = updatePost.bind(null, post.id);

  return (
    <AdminShell title="Edit post">
      <PostForm post={post} action={action} />
    </AdminShell>
  );
}
