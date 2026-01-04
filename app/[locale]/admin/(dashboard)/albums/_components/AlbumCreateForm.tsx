"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AlbumCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "创建失败");
      }
      setName("");
      setDescription("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>新建相册</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="album-name">相册名称</Label>
            <Input
              id="album-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：旅行日记"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-desc">描述（可选）</Label>
            <Input
              id="album-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="相册说明"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "创建中..." : "创建相册"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
