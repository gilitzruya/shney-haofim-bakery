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
