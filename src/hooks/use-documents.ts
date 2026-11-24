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

/** הודעת השגיאה שה-edge function החזירה (`{ error }`), במקום ההודעה הכללית של supabase-js
 * ("Edge Function returned a non-2xx status code"). */
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error !== "forbidden") return body.error;
    } catch {
      // גוף שאינו JSON — נופלים להודעת ברירת המחדל
    }
  }
  return fallback;
}

/**
 * הדפסה מרוכזת: `edge_print_documents` מוריד מריווחית את ה-PDF של כל תעודה ומאחד לקובץ אחד,
 * שנפתח בטאב חדש — משם הדפסה אחת לכל התעודות. האיחוד בשרת כי ריווחית לא מאפשרת להוריד את
 * הקובץ מהדפדפן (אין CORS). הטאב נפתח מיד בלחיצה (לפני ההמתנה לשרת), אחרת חוסם החלונות
 * הקופצים של הדפדפן חוסם אותו; אם בכל זאת נחסם — הקובץ יורד כקובץ רגיל.
 */
export function usePrintDocuments() {
  const mutation = useMutation({
    mutationFn: async (documentIds: string[]): Promise<Blob> => {
      const { data, error } = await supabase.functions.invoke<Blob>("edge_print_documents", {
        body: { documentIds },
      });
      if (error || !(data instanceof Blob)) {
        throw new Error(await functionErrorMessage(error, "הכנת קובץ ההדפסה נכשלה"));
      }
      return data;
    },
  });

  /** נקרא ישירות מאירוע הלחיצה — בלי await לפניו. */
  const print = async (documentIds: string[]) => {
    const tab = window.open("", "_blank");
    tab?.document.write(
      '<p dir="rtl" style="font-family:sans-serif;padding:24px">מכין את תעודות המשלוח להדפסה…</p>',
    );
    try {
      const blob = await mutation.mutateAsync(documentIds);
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = "תעודות-משלוח.pdf";
        link.click();
      }
      // הטאב טוען את הקובץ מהכתובת הזמנית — משחררים אותה רק אחרי שנטען.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      throw err;
    }
  };

  return { print, isPending: mutation.isPending };
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
