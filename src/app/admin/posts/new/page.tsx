import AdminShell from "@/components/AdminShell";
import PostForm from "@/components/PostForm";
import { createPost } from "@/app/actions/posts";

export default function NewPostPage() {
  return (
    <AdminShell title="New post">
      <PostForm action={createPost} />
    </AdminShell>
  );
}
