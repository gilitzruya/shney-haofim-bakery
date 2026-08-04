import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/data/seed";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "טיוטה",
  approved: "מאושרת",
  needs_update: "דורשת עדכון",
  reopened: "נפתחה מחדש",
  completed: "הושלמה",
  cancelled: "בוטלה",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  draft: "bg-accent text-accent-foreground",
  approved: "bg-accent text-accent-foreground",
  needs_update: "bg-accent-soft text-accent-foreground",
  reopened: "bg-accent-soft text-accent-foreground",
  completed: "bg-secondary text-muted-foreground",
  cancelled: "bg-secondary text-muted-foreground",
};

export function StatusChip({ status, className }: { status: OrderStatus; className?: string | undefined }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-[3px] text-[10.5px] font-bold",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "muted" | "error";
  className?: string | undefined;
}) {
  const tones = {
    neutral: "bg-accent text-accent-foreground",
    accent: "bg-accent-soft text-accent-foreground",
    muted: "bg-secondary text-muted-foreground",
    error: "bg-destructive-bg text-destructive",
  } as const;
  return (
    <span className={cn("shrink-0 rounded-full px-3 py-[3px] text-[10.5px] font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}
