"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AlbumCategoryOption {
  id: number;
  name: string;
}

interface AlbumFormFieldsProps {
  categoryId: number | null;
  categories: AlbumCategoryOption[];
  description: string;
  idsPrefix: string;
  name: string;
  onCategoryChange: (value: number) => void;
  onCoverChange: (file: File | null) => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
}

export function AlbumFormFields({
  categoryId,
  categories,
  description,
  idsPrefix,
  name,
  onCategoryChange,
  onCoverChange,
  onDescriptionChange,
  onNameChange,
}: AlbumFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idsPrefix}-name`}>相册名称</Label>
        <Input
          id={`${idsPrefix}-name`}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例如：旅行日记"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idsPrefix}-desc`}>描述（可选）</Label>
        <Input
          id={`${idsPrefix}-desc`}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="相册说明"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idsPrefix}-category`}>分类</Label>
        <select
          id={`${idsPrefix}-category`}
          value={categoryId ?? ""}
          onChange={(event) => onCategoryChange(Number(event.target.value))}
          className="border-input focus-visible:ring-ring flex h-9 w-full border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          disabled={categories.length === 0}
        >
          {categories.length === 0 ? (
            <option value="">暂无可用分类</option>
          ) : null}
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idsPrefix}-cover`}>封面（可选）</Label>
        <Input
          id={`${idsPrefix}-cover`}
          type="file"
          accept="image/*"
          onChange={(event) => onCoverChange(event.target.files?.[0] ?? null)}
        />
      </div>
    </>
  );
}
