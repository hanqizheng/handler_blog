"use client";

import { Button } from "@/components/ui/button";

type AdminDrawerActionsProps = {
  submitting?: boolean;
  primaryLabel?: string;
  primaryLoadingLabel?: string;
  secondaryLabel?: string;
  disabled?: boolean;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  formId?: string;
  confirmType?: "button" | "submit";
};

export function AdminDrawerActions({
  submitting = false,
  primaryLabel = "保存",
  primaryLoadingLabel = "保存中...",
  secondaryLabel = "取消",
  disabled = false,
  primaryDisabled = false,
  secondaryDisabled = false,
  onCancel,
  onConfirm,
  formId,
  confirmType = "button",
}: AdminDrawerActionsProps) {
  const resolvedConfirmType = formId ? "submit" : confirmType;
  const isDisabled = disabled || submitting;

  return (
    <div className="flex items-center gap-3">
      <Button
        type={resolvedConfirmType}
        form={formId}
        onClick={resolvedConfirmType === "button" ? onConfirm : undefined}
        disabled={isDisabled || primaryDisabled}
      >
        {submitting ? primaryLoadingLabel : primaryLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isDisabled || secondaryDisabled}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
}
