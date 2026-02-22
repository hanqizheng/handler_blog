import { redirect } from "next/navigation";

export default function AdminNewPostPage() {
  redirect("/admin/posts?drawer=create");
}
