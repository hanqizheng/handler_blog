import { PostEditorForm } from "../_components/PostEditorForm";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function AdminNewPostPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <PostEditorForm mode="create" />
      <Button asChild variant="ghost">
        <Link href="/admin/posts">返回文章列表</Link>
      </Button>
    </main>
  );
}
