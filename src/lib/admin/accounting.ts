import type { AdminOrderView } from "@/hooks/use-orders";

/**
 * טיפוסי מסמכי הנהלת חשבונות (ריווחית אונליין) — ההפקה עצמה רצה בשרת (`edge_issue_document`,
 * `src/hooks/use-documents.ts`), לא בדפדפן. שלב א׳: תעודות משלוח בלבד (PRD §2.8, החלטה 23).
 */

export type DocumentType = "delivery_note" | "invoice";
export type DocumentStatus = "pending" | "issued" | "error";

export interface AdminDocument {
  id: string;
  orderId: string;
  type: DocumentType;
  status: DocumentStatus;
  /** מספר המסמך במערכת החשבונות (כשהופק) */
  number?: string | undefined;
  /** קישור ל-PDF של המסמך בריווחית (כשהופק) */
  link?: string | undefined;
  error?: string | undefined;
  createdAt: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  delivery_note: "תעודת משלוח",
  invoice: "חשבונית",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "בהפקה",
  issued: "הופק",
  error: "שגיאה",
};

export const ACCOUNTING_PROVIDER_NAME = "ריווחית אונליין";

/** התעודה האחרונה שהופקה בהצלחה להזמנה — `documents` ממוין מהחדש לישן. */
export function latestIssuedDeliveryNote(
  documents: AdminDocument[],
  orderId: string,
): AdminDocument | undefined {
  return documents.find(
    (d) => d.orderId === orderId && d.type === "delivery_note" && d.status === "issued",
  );
}

const isDigits = (value: string) => /^\d+$/.test(value);

/** הסיבה שריווחית תדחה את התעודה, או undefined — אותה ולידציה כמו `buildDeliveryNote`
 * ב-edge_issue_document (שם היא נאכפת), כדי להציג אותה בחלון האישור לפני השליחה. */
export function deliveryNoteProblem(view: AdminOrderView): string | undefined {
  const code = view.customerCode?.trim() ?? "";
  if (!isDigits(code)) return `קוד הלקוח "${code}" אינו מספר לקוח תקין בריווחית`;
  if (view.order.lines.length === 0) return "אין מוצרים בהזמנה";
  const missingSku = view.order.lines.find((l) => !l.sku || !isDigits(l.sku.trim()));
  if (missingSku) return `למוצר "${missingSku.productName}" אין מק"ט תקין`;
  return undefined;
}

export interface IssuingGroups {
  /** נשלחו ואין להן תעודה שהופקה בהצלחה (כישלון קודם ← ניסיון חוזר), או מופע קבוע וירטואלי */
  eligible: AdminOrderView[];
  /** יש תעודה, וההזמנה לא השתנתה מאז */
  alreadyIssued: AdminOrderView[];
  /** יש תעודה, אבל ההזמנה נערכה אחריה — הפקה מחדש רק מפירוט ההזמנה (החלטה 23) */
  changedSinceIssued: AdminOrderView[];
  /** טיוטה או מבוטלת */
  notSent: AdminOrderView[];
}

/** חלוקת הזמנות היום לפי מה שיקרה להן בהפקה מרוכזת של תעודות משלוח. */
export function classifyForIssuing(views: AdminOrderView[], documents: AdminDocument[]): IssuingGroups {
  const groups: IssuingGroups = { eligible: [], alreadyIssued: [], changedSinceIssued: [], notSent: [] };
  for (const view of views) {
    const { order } = view;
    if (order.status !== "approved" && order.status !== "completed") {
      groups.notSent.push(view);
      continue;
    }
    const issued = view.isVirtual ? undefined : latestIssuedDeliveryNote(documents, order.id);
    if (!issued) groups.eligible.push(view);
    // המעבר האוטומטי ל-completed מעדכן גם הוא את updated_at — והזמנה שהושלמה ממילא נעולה
    // לעריכה ולהפקה מחדש, כך שאצלה "השתנתה" אינו מידע שאפשר לפעול לפיו.
    else if (order.status === "approved" && order.updatedAt > issued.createdAt) groups.changedSinceIssued.push(view);
    else groups.alreadyIssued.push(view);
  }
  return groups;
}
