// edge_issue_document — מפיק תעודות משלוח להזמנות (PRD §2.8, §8.2).
//
// שלב א׳: אין עדיין חיבור אמיתי לריווחית — ראו `issueWithAdapter` למטה. הפונקציה הזו
// היא נקודת המעבר היחידה: כשיתחבר ספק אמיתי, רק המימוש הפנימי שלה משתנה (קריאת רשת +
// מפתח סוד השרת) — לא שכבת ה-DB/RLS שסביבה. הרצה בשרת (ולא ישירות מהדפדפן) חשובה כבר
// עכשיו כדי שמפתח הספק העתידי לעולם לא יגיע ל-bundle (כלל ברזל 4).
//
// ללא תלויות חיצוניות בכוונה (fetch גולמי אל PostgREST במקום @supabase/supabase-js) —
// פונקציה בהיקף כזה לא מצדיקה תלות, וכך אין תלות ברשת חיצונית (jsr.io/esm.sh) בזמן קור-סטארט.

type DocumentType = "delivery_note" | "invoice";

interface IssueRequest {
  orderIds: string[];
  type?: DocumentType;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** קריאת REST אל PostgREST תחת ה-JWT של הקורא (לא service_role) — RLS על documents
 * (admin-only) אוכפת הרשאות בפועל, לא רק ה-verify_jwt הכללי שנבדק לפני שהקוד מתחיל לרוץ. */
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

/** מתאם דמו — יוחלף במתאם ריווחית אמיתי כשיהיה חיבור (PRD §2.8: היקף שלב א׳ הוא תעודות
 * משלוח בלבד, ובמצב "לא מחובר" כמו באב-הטיפוס). */
async function issueWithAdapter(authHeader: string, type: DocumentType): Promise<string> {
  return await postgrest("rpc/fn_next_document_number", authHeader, {
    method: "POST",
    body: JSON.stringify({ p_type: type }),
  });
}

async function insertDocument(authHeader: string, row: Record<string, unknown>) {
  const [doc] = await postgrest("documents", authHeader, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return doc;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  let body: IssueRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }

  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds.filter((id) => typeof id === "string")
    : [];
  const type: DocumentType = body.type === "invoice" ? "invoice" : "delivery_note";

  if (orderIds.length === 0) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  const results = await Promise.all(
    orderIds.map(async (orderId) => {
      try {
        const number = await issueWithAdapter(authHeader, type);
        return await insertDocument(authHeader, {
          order_id: orderId,
          type,
          status: "issued",
          number,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "ההפקה נכשלה";
        try {
          return await insertDocument(authHeader, {
            order_id: orderId,
            type,
            status: "error",
            error: message,
          });
        } catch {
          return { order_id: orderId, type, status: "error", error: message };
        }
      }
    }),
  );

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
