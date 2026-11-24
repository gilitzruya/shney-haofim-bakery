// edge_print_documents — מאחד כמה תעודות משלוח מריווחית לקובץ PDF אחד, להדפסה אחת.
//
// הקישור "צפייה בתעודה" (`documents.link`) מצביע על PDF בשרת של ריווחית, שלא מחזיר כותרת
// CORS — הדפדפן לא יכול להוריד אותו מתוך האפליקציה ולאחד בעצמו. לכן ההורדה והאיחוד כאן,
// בצד השרת. הפונקציה לא מקבלת כתובת מהלקוח: היא מורידה רק קישורים שכבר שמורים בטבלה
// `documents` (נקראת תחת ה-JWT של הקורא, כלומר RLS), ורק מהשרת של ריווחית.
//
// התלות החיצונית היחידה בפונקציות (pdf-lib) — אין דרך לאחד PDF בלי ספרייה.

import { PDFDocument } from "npm:pdf-lib@1.17.1";

interface PrintRequest {
  documentIds: string[];
}

interface DocumentRow {
  id: string;
  number: string | null;
  link: string | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** רק קבצים מהשרת של ריווחית — גם אם בטבלה ייכתב פעם קישור אחר, לא נוריד אותו. */
const RIVHIT_PDF_HOST = "api.rivhit.co.il";
const RIVHIT_PDF_PATH = "/pdf/FileService.svc/GetDocument/";

/** הורדה בקבוצות קטנות ולא הכול במקביל — כמו בהפקה, כדי לא להעמיס על ריווחית. */
const FETCH_BATCH_SIZE = 5;

/** תקרה להדפסה אחת — יום עבודה רגיל הוא כ-20 תעודות. */
const MAX_DOCUMENTS = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** קריאת REST אל PostgREST תחת ה-JWT של הקורא (לא service_role) — RLS על documents אוכפת
 * הרשאות בפועל. אותו מבנה כמו ב-edge_issue_document. */
async function postgrest(path: string, authHeader: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (
      data && typeof data === "object" && "message" in data ? data.message : text
    ) as string;
    throw new Error(message || `PostgREST error (${res.status})`);
  }
  return data;
}

function isRivhitPdfLink(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname === RIVHIT_PDF_HOST && url.pathname.startsWith(RIVHIT_PDF_PATH);
  } catch {
    return false;
  }
}

const label = (doc: DocumentRow) => (doc.number ? `תעודה ${doc.number}` : "תעודה");

async function downloadPdf(doc: DocumentRow): Promise<Uint8Array> {
  if (!doc.link || !isRivhitPdfLink(doc.link)) throw new Error(`ל${label(doc)} אין קישור תקין לריווחית`);
  const res = await fetch(doc.link);
  if (!res.ok) throw new Error(`הורדת ${label(doc)} מריווחית נכשלה (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  let body: PrintRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const documentIds = Array.isArray(body.documentIds)
    ? [...new Set(body.documentIds.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))]
    : [];
  if (documentIds.length === 0) return jsonResponse({ error: "לא נבחרו תעודות להדפסה" }, 400);
  if (documentIds.length > MAX_DOCUMENTS) {
    return jsonResponse({ error: `אפשר להדפיס עד ${MAX_DOCUMENTS} תעודות בבת אחת` }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  // מסמכים פנימיים של המאפייה (כולל מחירים) — מנהל בלבד, כמו הפקת התעודות.
  let isAdmin = false;
  try {
    isAdmin = (await postgrest("rpc/fn_is_admin", authHeader, { method: "POST", body: "{}" })) === true;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin) return jsonResponse({ error: "forbidden" }, 403);

  try {
    const rows = (await postgrest(
      `documents?id=in.(${documentIds.join(",")})&status=eq.issued&select=id,number,link`,
      authHeader,
    )) as DocumentRow[];
    // הסדר בקובץ = הסדר שבו הקורא שלח (סדר המסך), לא הסדר שבו ה-DB החזיר.
    const byId = new Map(rows.map((r) => [r.id, r]));
    const missing = documentIds.filter((id) => !byId.has(id)).length;
    if (missing > 0) throw new Error(`${missing} מהתעודות שנבחרו לא נמצאו או לא הופקו בהצלחה`);
    const ordered = documentIds.map((id) => byId.get(id)!);

    const files: Uint8Array[] = [];
    for (let i = 0; i < ordered.length; i += FETCH_BATCH_SIZE) {
      files.push(...(await Promise.all(ordered.slice(i, i + FETCH_BATCH_SIZE).map(downloadPdf))));
    }

    const merged = await PDFDocument.create();
    for (const [i, bytes] of files.entries()) {
      let source: PDFDocument;
      try {
        source = await PDFDocument.load(bytes);
      } catch {
        throw new Error(`הקובץ של ${label(ordered[i]!)} מריווחית אינו PDF תקין`);
      }
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }

    return new Response(await merged.save(), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="delivery-notes.pdf"',
      },
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "הכנת קובץ ההדפסה נכשלה" }, 502);
  }
});
