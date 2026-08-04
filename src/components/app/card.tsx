import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "active" | "muted" | "attention";

export function Card({
  variant = "active",
  className,
  children,
}: {
  variant?: CardVariant;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] p-3.5",
        variant === "active" && "border border-border bg-card",
        variant === "muted" && "border border-dashed border-border bg-card-muted",
        variant === "attention" && "border border-border border-e-[3px] border-e-primary bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card header convention: title pinned to the start (right in RTL), chip to the end. */
export function CardHeader({ title, chip }: { title: ReactNode; chip?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13.5px] font-semibold text-foreground">{title}</span>
      {chip}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string | undefined;
  icon?: ReactNode | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-border bg-card px-4 py-5 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="text-[13.5px] font-semibold text-foreground">{title}</div>
      {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description?: string | undefined; onRetry?: (() => void) | undefined }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[14px] border border-border bg-destructive-bg px-4 py-5 text-center">
      <div className="text-[13.5px] font-bold text-destructive">{title}</div>
      {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground"
        >
          נסו שוב
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="shimmer h-[86px] rounded-[14px] border border-border bg-card" />;
}
