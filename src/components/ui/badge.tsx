import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        default:
          "border-transparent bg-[color:var(--color-muted)] text-[color:var(--color-muted-fg)]",
        primary:
          "border-transparent bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]",
        success:
          "border-transparent bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
        warning:
          "border-transparent bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
        danger:
          "border-transparent bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]",
        outline: "border-[color:var(--color-border)] bg-transparent",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
