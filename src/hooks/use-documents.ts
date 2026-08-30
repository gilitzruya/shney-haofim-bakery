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
    ...(row.error ? { error: row.error } : {}),
    createdAt: row.created_at,
  };
}

/** יומן המסמכים כולו (`/admin/documents`) — היקף שלב א׳: תעודות משלוח בלבד, אבל
 * הטבלה/ה-RLS כבר תומכות גם ב-`invoice` לעתיד (PRD §2.8). כמות נמוכה, אין צורך
 * בסינון בשרת מעבר לכך — כמו `useCatalog`. */
export function useDocuments() {
  const query = useQuery({
    queryKey: documentsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, order_id, type, status, number, error, created_at")
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

/** מפיק תעודות משלוח דרך `edge_issue_document` — ההזמנות חייבות להיות רשומות אמיתיות
 * (מופע וירטואלי של הזמנה קבועה ממומש קודם על ידי הקורא, ראו PRD §4.1-4.2). */
export function useIssueDocuments() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async ({
      orderIds,
      type = "delivery_note",
    }: {
      orderIds: string[];
      type?: DocumentType;
    }) => {
      if (orderIds.length === 0) return;
      const { error } = await supabase.functions.invoke("edge_issue_document", {
        body: { orderIds, type },
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
