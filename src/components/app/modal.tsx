import type { ReactNode } from "react";

import { Button } from "./button";

export function Modal({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "חזרה",
  onConfirm,
  onClose,
  destructive = false,
  loading = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  destructive?: boolean;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(32,21,24,0.5)] p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-[320px] flex-col gap-3.5 rounded-2xl bg-card p-5">
        <div className="text-[17px] font-bold text-foreground">{title}</div>
        {description ? (
          <div className="text-[12.5px] leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
        {children}
        {confirmLabel ? (
          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1 font-semibold" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              className="flex-1"
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="font-semibold" onClick={onClose}>
            סגירה
          </Button>
        )}
      </div>
    </div>
  );
}
