/**
 * שכבת חיבור להנהלת חשבונות (ריווחית) — ממשק בלבד.
 * כרגע פועל מתאם מקומי (דמו) שמפיק מספרי מסמך ללא קריאות רשת.
 */

export type DocumentType = "delivery_note" | "invoice";
export type DocumentStatus = "pending" | "issued" | "error";

export interface AdminDocument {
  id: string;
  orderId: string;
  type: DocumentType;
  status: DocumentStatus;
  /** מספר המסמך במערכת החשבונות (כשהופק) */
  number?: string;
  error?: string;
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

export interface IssueDocumentInput {
  orderId: string;
  type: DocumentType;
}

export interface IssueDocumentResult {
  status: DocumentStatus;
  number?: string;
  error?: string;
}

export interface AccountingAdapter {
  /** שם הספק המוצג במסכי הניהול */
  name: string;
  /** האם קיים חיבור פעיל לספק */
  connected: boolean;
  issueDocument: (input: IssueDocumentInput) => Promise<IssueDocumentResult>;
}

let counter = 1000;

/** מתאם דמו מקומי — מחליף בהמשך במתאם ריווחית אמיתי. */
export const localAccountingAdapter: AccountingAdapter = {
  name: "ריווחית (הכנה)",
  connected: false,
  issueDocument: async ({ type }) => {
    counter += 1;
    const prefix = type === "delivery_note" ? "TM" : "INV";
    return { status: "issued", number: `${prefix}-${counter}` };
  },
};

export function accountingAdapter(): AccountingAdapter {
  return localAccountingAdapter;
}
