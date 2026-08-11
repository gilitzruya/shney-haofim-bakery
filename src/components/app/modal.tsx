import type { ReactNode } from "react";
import { X } from "lucide-react";

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
  xClose = false,
}: {
  open: boolean;
  title: string;
  description?: string | undefined;
  children?: ReactNode | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string;
  onConfirm?: (() => void) | undefined;
  onClose: () => void;
  destructive?: boolean;
  loading?: boolean;
  /** מציג איקס לסגירה בפינה במקום כפתור "סגירה" */
  xClose?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(32,21,24,0.5)] p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex w-full max-w-[320px] flex-col gap-3.5 rounded-2xl bg-card p-5">
        {xClose ? (
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="absolute left-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card-muted"
          >
            <X className="size-[16px]" />
          </button>
        ) : null}
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
        ) : xClose ? null : (
          <Button variant="secondary" className="font-semibold" onClick={onClose}>
            סגירה
          </Button>
        )}
      </div>
    </div>
  );
}
