import { useMemo, useState } from "react";

import { Chip } from "@/components/app/status-chip";
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
  deliveryNoteProblem,
  type AdminDocument,
} from "@/lib/admin/accounting";
import { formatDate, formatPrice, formatWeekday, orderNumberLabel } from "@/lib/format";

interface DialogProps {
  date: string;
  views: AdminOrderView[];
  documents: AdminDocument[];
  onConfirm: (views: AdminOrderView[]) => void;
}

/**
 * אישור לפני הפקה מרוכזת של תעודות משלוח (דף הבית ומסך ההזמנות). כל תעודה היא מסמך אמיתי
 * בריווחית שאי אפשר לבטל מהאפליקציה — לכן מציגים בדיוק לאילו הזמנות היא תופק, ומאפשרים
 * להוריד סימון. הזמנה שריווחית תדחה (בדיקה זהה לשרת) מוצגת עם הסיבה ולא ניתנת לסימון.
 * הרכיב לא מפיק בעצמו: `onConfirm` מקבל את ההזמנות שסומנו.
 */
export function IssueDeliveryNotesDialog({
  open,
  onOpenChange,
  ...props
}: DialogProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto text-right">
        {/* התוכן נבנה מחדש בכל פתיחה (Radix מסיר אותו בסגירה) — הסימון מתאפס לכל ההזמנות התקינות. */}
        <IssueDeliveryNotesBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IssueDeliveryNotesBody({ date, views, documents, onConfirm }: DialogProps) {
  const groups = useMemo(() => classifyForIssuing(views, documents), [views, documents]);
  const valid = useMemo(() => groups.eligible.filter((v) => !deliveryNoteProblem(v)), [groups]);
  const [selected, setSelected] = useState(() => new Set(valid.map((v) => v.order.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = valid.filter((v) => selected.has(v.order.id));
  const allSelected = chosen.length === valid.length;
  const excludedCount =
    groups.alreadyIssued.length + groups.changedSinceIssued.length + groups.notSent.length;

  return (
    <>
      <AlertDialogHeader className="text-right">
        <AlertDialogTitle>הפקת תעודות משלוח בריווחית</AlertDialogTitle>
        <AlertDialogDescription>
          לתאריך אספקה {formatWeekday(date)}, {formatDate(date)}. התעודות נוצרות בריווחית ולא ניתן
          לבטל אותן מהאפליקציה.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {groups.eligible.length > 0 ? (
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex items-center justify-between px-1 text-[12px]">
            <span className="font-semibold text-heading">
              נבחרו {chosen.length} מתוך {groups.eligible.length}
            </span>
            {valid.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(valid.map((v) => v.order.id)))
                }
                className="font-bold text-primary"
              >
                {allSelected ? "ניקוי הסימון" : "סימון הכול"}
              </button>
            ) : null}
          </div>
          <div className="max-h-[45dvh] overflow-y-auto rounded-[14px] border border-border">
            {groups.eligible.map((view) => {
              const problem = deliveryNoteProblem(view);
              return (
                <label
                  key={view.order.id}
                  className="flex cursor-pointer items-start gap-2.5 border-b border-dashed border-border px-3 py-2.5 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={!problem && selected.has(view.order.id)}
                    disabled={!!problem}
                    onChange={() => toggle(view.order.id)}
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {view.customerName}
                      </span>
                      {view.isVirtual ? <Chip tone="muted">קבועה</Chip> : null}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {view.order.number !== null
                        ? `${orderNumberLabel(view.order.number)} · `
                        : ""}
                      קוד {view.customerCode ?? "—"} · {view.itemsCount} מוצרים
                    </span>
                    {problem ? (
                      <span className="text-[11px] text-destructive">{problem}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-end text-[12.5px] font-bold text-heading tabular-nums">
                    {formatPrice(view.total)}
                  </span>
                </label>
              );
            })}
          </div>
          <span className="px-1 text-[11px] text-muted-foreground">הסכומים לפני מע״מ.</span>
        </div>
      ) : null}

      {excludedCount > 0 ? (
        <div className="flex flex-col gap-0.5 px-1 text-[11.5px] text-muted-foreground">
          <span className="font-semibold">לא ייכללו:</span>
          {groups.alreadyIssued.length > 0 ? (
            <span>כבר הופקה תעודה: {groups.alreadyIssued.length}</span>
          ) : null}
          {groups.changedSinceIssued.length > 0 ? (
            <span className="text-destructive">
              השתנו מאז ההפקה: {groups.changedSinceIssued.length} (
              {groups.changedSinceIssued
                .map((v) => `${v.customerName}, ${orderNumberLabel(v.order.number)}`)
                .join("; ")}
              ) — יש להפיק מחדש מפירוט ההזמנה
            </span>
          ) : null}
          {groups.notSent.length > 0 ? (
            <span>לא נשלחו או בוטלו: {groups.notSent.length}</span>
          ) : null}
        </div>
      ) : null}

      <AlertDialogFooter className="gap-2 sm:justify-start">
        <AlertDialogCancel>חזרה</AlertDialogCancel>
        <AlertDialogAction disabled={chosen.length === 0} onClick={() => onConfirm(chosen)}>
          {chosen.length === 1 ? "הפקת תעודה אחת" : `הפקת ${chosen.length} תעודות`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
