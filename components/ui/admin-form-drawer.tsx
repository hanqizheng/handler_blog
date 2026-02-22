"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const DRAWER_WIDTH_CLASS = {
  480: "sm:max-w-[480px]",
  560: "sm:max-w-[560px]",
  640: "sm:max-w-[640px]",
} as const;

export type AdminFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: 480 | 560 | 640;
  dirty?: boolean;
  closeConfirmText?: string;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const DEFAULT_CLOSE_CONFIRM_TEXT = "确认放弃未保存的更改吗？";

export function AdminFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  width = 640,
  dirty = false,
  closeConfirmText = DEFAULT_CLOSE_CONFIRM_TEXT,
  className,
  bodyClassName,
  footer,
  children,
}: AdminFormDrawerProps) {
  const requestClose = React.useCallback(() => {
    if (dirty && !window.confirm(closeConfirmText)) {
      return;
    }

    onOpenChange(false);
  }, [closeConfirmText, dirty, onOpenChange]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        requestClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          className={cn(
            "bg-background fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-full flex-col border-l shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            DRAWER_WIDTH_CLASS[width],
            className,
          )}
          onPointerDownOutside={(event) => {
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-muted-foreground text-sm">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md border transition"
              onClick={requestClose}
              aria-label="关闭"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-5 py-4",
              bodyClassName,
            )}
          >
            {children}
          </div>
          {footer ? <div className="border-t px-5 py-4">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
