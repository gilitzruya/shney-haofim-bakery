import { FileText, X } from "lucide-react";

import { Button } from "@/components/app/button";

/** סרגל פעולות להפקה מרוכזת של תעודות משלוח. */
export function BatchDocumentsBar({
  count,
  busy,
  onIssue,
  onClear,
}: {
  count: number;
  busy: boolean;
  onIssue: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-20 mt-3 flex items-center justify-between gap-2 rounded-[16px] border border-border bg-card px-3 py-2.5 shadow-header">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="ניקוי הבחירה"
          onClick={onClear}
          className="flex size-8 items-center justify-center rounded-[10px] border border-border text-muted-foreground"
        >
          <X className="size-4" />
        </button>
        <span className="text-[12.5px] font-semibold text-heading">{count} הזמנות נבחרו</span>
      </div>
      <Button size="sm" onClick={onIssue} loading={busy}>
        <FileText className="size-4" />
        הפקת תעודות
      </Button>
    </div>
  );
}
