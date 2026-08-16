import { Chip } from "@/components/app/status-chip";
import { DOCUMENT_STATUS_LABELS, type AdminDocument } from "@/lib/admin/accounting";

/** מציג את סטטוס המסמך האחרון של ההזמנה. */
export function DocumentStatusChip({ document }: { document: AdminDocument | undefined }) {
  if (!document) return <Chip tone="muted">טרם הופק</Chip>;
  if (document.status === "error") return <Chip tone="error">שגיאה בהפקה</Chip>;
  if (document.status === "pending") return <Chip tone="accent">{DOCUMENT_STATUS_LABELS.pending}</Chip>;
  return <Chip tone="neutral">הופק {document.number ? `· ${document.number}` : ""}</Chip>;
}
