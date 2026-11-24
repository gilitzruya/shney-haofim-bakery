import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminOrderView } from "@/hooks/use-orders";
import {
  classifyForIssuing,
  latestIssuedDeliveryNote,
  type AdminDocument,
} from "@/lib/admin/accounting";
import { formatDate, formatPrice, formatWeekday, orderNumberLabel } from "@/lib/format";

interface DialogProps {
  date: string;
  /** ההזמנות של היום בסדר שבו הן מוצגות במסך — זה גם סדר הדפים בקובץ */
  views: AdminOrderView[];
  documents: AdminDocument[];
  onConfirm: (documentIds: string[]) => void;
}

/**
 * בחירת תעודות משלוח להדפסה מרוכזת ממסך ההזמנות — באותו מבנה כמו חלון ההפקה
 * (`IssueDeliveryNotesDialog`). רק הזמנה עם תעודה שהופקה ולא השתנתה מאז נכללת; כל השאר
 * מוצגות תחת "לא ייכללו" עם הסיבה, כדי שבעל המאפייה יראה לפני ההדפסה שחסרה תעודה.
 */
export function PrintDeliveryNotesDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto text-right">
        <PrintDeliveryNotesBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PrintDeliveryNotesBody({ date, views, documents, onConfirm }: DialogProps) {
  const groups = useMemo(() => classifyForIssuing(views, documents), [views, documents]);
  const printable = useMemo(
    () =>
      groups.alreadyIssued.flatMap((view) => {
        const doc = latestIssuedDeliveryNote(documents, view.order.id);
        return doc ? [{ view, doc }] : [];
      }),
    [groups, documents],
  );
  const [selected, setSelected] = useState(() => new Set(printable.map((p) => p.doc.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = printable.filter((p) => selected.has(p.doc.id));
  const allSelected = chosen.length === printable.length;
  // הזמנה שאין לה תעודה תקינה: ניסיון אחרון שנכשל ← "שגיאה בהפקה", אחרת "טרם הופקה".
  const failed = groups.eligible.filter((v) =>
    documents.some((d) => d.orderId === v.order.id && d.type === "delivery_note"),
  );
  const notIssued = groups.eligible.filter((v) => !failed.includes(v));
  const names = (list: AdminOrderView[]) => list.map((v) => v.customerName).join(", ");

  return (
    <>
      <AlertDialogHeader className="text-right">
        <AlertDialogTitle>הדפסת תעודות משלוח</AlertDialogTitle>
        <AlertDialogDescription>
          לתאריך אספקה {formatWeekday(date)}, {formatDate(date)}. כל התעודות שנבחרו ייפתחו בקובץ
          אחד, להדפסה אחת.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {printable.length > 0 ? (
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex items-center justify-between px-1 text-[12px]">
            <span className="font-semibold text-heading">
              נבחרו {chosen.length} מתוך {printable.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(printable.map((p) => p.doc.id)))
              }
              className="font-bold text-primary"
            >
              {allSelected ? "ניקוי הסימון" : "סימון הכול"}
            </button>
          </div>
          <div className="max-h-[45dvh] overflow-y-auto rounded-[14px] border border-border">
            {printable.map(({ view, doc }) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-start gap-2.5 border-b border-dashed border-border px-3 py-2.5 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {view.customerName}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    תעודה {doc.number ?? "—"}
                    {view.order.number !== null ? ` · ${orderNumberLabel(view.order.number)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-end text-[12.5px] font-bold text-heading tabular-nums">
                  {formatPrice(view.total)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-1 text-[13px] text-muted-foreground">אין ליום הזה תעודות שהופקו להדפסה.</p>
      )}

      {failed.length + notIssued.length + groups.changedSinceIssued.length > 0 ? (
        <div className="flex flex-col gap-0.5 px-1 text-[11.5px] text-muted-foreground">
          <span className="font-semibold">לא ייכללו:</span>
          {failed.length > 0 ? (
            <span className="text-destructive">
              שגיאה בהפקה: {failed.length} ({names(failed)}) — הפירוט בפירוט ההזמנה
            </span>
          ) : null}
          {notIssued.length > 0 ? (
            <span>
              טרם הופקה תעודה: {notIssued.length} ({names(notIssued)})
            </span>
          ) : null}
          {groups.changedSinceIssued.length > 0 ? (
            <span className="text-destructive">
              השתנו מאז ההפקה: {groups.changedSinceIssued.length} (
              {names(groups.changedSinceIssued)}) — יש להפיק מחדש מפירוט ההזמנה
            </span>
          ) : null}
        </div>
      ) : null}

      <AlertDialogFooter className="gap-2 sm:justify-start">
        <AlertDialogCancel>חזרה</AlertDialogCancel>
        <AlertDialogAction
          disabled={chosen.length === 0}
          onClick={() => onConfirm(chosen.map((p) => p.doc.id))}
        >
          {chosen.length === 1 ? "הדפסת תעודה אחת" : `הדפסת ${chosen.length} תעודות`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
