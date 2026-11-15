import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";
import type { AdminDocument, DocumentStatus, DocumentType } from "@/lib/admin/accounting";

export const documentsQueryKey = ["documents"] as const;

type DocumentRow = {
  id: string;
  order_id: string;
  type: string;
  status: string;
  number: string | null;
  link: string | null;
  error: string | null;
  created_at: string;
};

function toAdminDocument(row: DocumentRow): AdminDocument {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type as DocumentType,
    status: row.status as DocumentStatus,
    ...(row.number ? { number: row.number } : {}),
    ...(row.link ? { link: row.link } : {}),
    ...(row.error ? { error: row.error } : {}),
    createdAt: row.created_at,
  };
}

/** יומן המסמכים כולו (`/admin/documents`), מהחדש לישן — היקף שלב א׳: תעודות משלוח בלבד, אבל
 * הטבלה/ה-RLS כבר תומכות גם ב-`invoice` לעתיד (PRD §2.8). כמות נמוכה, אין צורך
 * בסינון בשרת מעבר לכך — כמו `useCatalog`. */
export function useDocuments() {
  const query = useQuery({
    queryKey: documentsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, order_id, type, status, number, link, error, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toAdminDocument);
    },
  });
  return { documents: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: documentsQueryKey });
}

export interface IssueSummary {
  issued: number;
  failed: number;
  /** הודעת השגיאה של הכישלון הראשון, להצגה מיידית */
  firstError?: string | undefined;
}

/** מפיק תעודות משלוח בריווחית דרך `edge_issue_document` — ההזמנות חייבות להיות רשומות
 * אמיתיות (מופע וירטואלי של הזמנה קבועה ממומש קודם על ידי הקורא, ראו PRD §4.1-4.2).
 * מחזיר כמה הופקו וכמה נכשלו — פירוט השגיאה נשמר בשורת המסמך עצמה. */
export function useIssueDocuments() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async ({
      orderIds,
      type = "delivery_note",
    }: {
      orderIds: string[];
      type?: DocumentType;
    }): Promise<IssueSummary> => {
      if (orderIds.length === 0) return { issued: 0, failed: 0 };
      const { data, error } = await supabase.functions.invoke<{
        results: { status: string; error?: string | null }[];
      }>("edge_issue_document", { body: { orderIds, type } });
      if (error) throw error;
      const results = data?.results ?? [];
      const issued = results.filter((r) => r.status === "issued").length;
      const firstError = results.find((r) => r.status !== "issued")?.error ?? undefined;
      return { issued, failed: results.length - issued, firstError };
    },
    onSettled: invalidate,
  });
}
