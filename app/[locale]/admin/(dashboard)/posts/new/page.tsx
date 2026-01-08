import { PostEditorForm } from "../_components/PostEditorForm";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function AdminNewPostPage() {
  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <PostEditorForm mode="create" />
      <Button asChild variant="ghost">
        <Link href="/admin/posts">返回文章列表</Link>
      </Button>
    </section>
  );
}
