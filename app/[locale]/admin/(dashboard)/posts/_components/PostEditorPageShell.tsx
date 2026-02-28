"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";

import { PostEditorForm } from "./PostEditorForm";

const LEAVE_CONFIRM_TEXT = "有未保存的更改，确定要离开吗？";

type PostCategoryOption = {
  id: number;
  name: string;
  isActive: number;
  sortOrder: number;
};

type CommonProps = {
  title: string;
  description: string;
  categories: PostCategoryOption[];
};

type CreateProps = CommonProps & {
  mode: "create";
};

type EditProps = CommonProps & {
  mode: "edit";
  postId: number;
  initialTitle: string;
  initialContent: string;
  initialAssetFolder: string;
  initialCoverImageUrl: string;
  initialCategoryId: number;
};

type PostEditorPageShellProps = CreateProps | EditProps;

export function PostEditorPageShell(props: PostEditorPageShellProps) {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  const handleDirtyChange = useCallback((next: boolean) => {
    dirtyRef.current = next;
    setDirty(next);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleBack = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (dirty && !window.confirm(LEAVE_CONFIRM_TEXT)) {
        e.preventDefault();
      }
    },
    [dirty],
  );

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <Link
          href="/admin/posts"
          onClick={handleBack}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{props.title}</h1>
        <p className="text-sm text-slate-500">{props.description}</p>
      </div>
      {props.mode === "create" ? (
        <PostEditorForm
          mode="create"
          categories={props.categories}
          onDirtyChange={handleDirtyChange}
        />
      ) : (
        <PostEditorForm
          mode="edit"
          postId={props.postId}
          initialTitle={props.initialTitle}
          initialContent={props.initialContent}
          initialAssetFolder={props.initialAssetFolder}
          initialCoverImageUrl={props.initialCoverImageUrl}
          initialCategoryId={props.initialCategoryId}
          categories={props.categories}
          onDirtyChange={handleDirtyChange}
        />
      )}
    </section>
  );
}
