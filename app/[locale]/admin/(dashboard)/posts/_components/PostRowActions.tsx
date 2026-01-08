"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function PostRowActions({ id }: { id: number }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("确认删除这篇文章吗？")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("删除失败");
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("删除失败，请稍后再试");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "删除中..." : "删除"}
    </Button>
  );
}
