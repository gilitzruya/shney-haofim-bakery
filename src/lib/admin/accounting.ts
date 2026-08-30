/**
 * טיפוסי מסמכי הנהלת חשבונות (ריווחית) — ההפקה עצמה רצה בשרת (`edge_issue_document`,
 * `src/hooks/use-documents.ts`), לא בדפדפן. שלב א׳: תעודות משלוח בלבד, במצב "לא מחובר"
 * (PRD §2.8).
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

/** תצוגת מצב החיבור לספק במסך יומן המסמכים — עדיין לא מחובר (שלב א׳). */
export const ACCOUNTING_PROVIDER_NAME = "ריווחית (הכנה)";
export const ACCOUNTING_CONNECTED = false;
