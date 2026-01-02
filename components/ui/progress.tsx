import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200",
        className,
      )}
      {...props}
    >
      <div
        className="h-full bg-slate-900 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  ),
);

Progress.displayName = "Progress";
