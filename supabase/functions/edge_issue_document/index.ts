// edge_issue_document — מפיק תעודות משלוח להזמנות בריווחית אונליין (PRD §2.8, §8.2, החלטה 23).
//
// כל הזמנה ← קריאת `Document.New` אחת: קוד הלקוח אצלנו = מספר הלקוח בריווחית, וכל שורת
// הזמנה נשלחת כשורה נפרדת עם המק"ט, השם והמחיר (לפני מע"מ) שנשמרו בהזמנה — ריווחית מוסיפה
// את המע"מ. הרצה בשרת (ולא מהדפדפן) כדי שמפתח ה-API של ריווחית לעולם לא יגיע ל-bundle
// (כלל ברזל 4). המפתח נקרא מהסוד `RIVHIT_API_TOKEN` — מקומית: טוקן הטסט הציבורי של ריווחית
// (`supabase/functions/.env`), בייצור: הטוקן של המאפייה.
//
// ללא תלויות חיצוניות בכוונה (fetch גולמי אל PostgREST במקום @supabase/supabase-js) —
// פונקציה בהיקף כזה לא מצדיקה תלות, וכך אין תלות ברשת חיצונית (jsr.io/esm.sh) בזמן קור-סטארט.

type DocumentType = "delivery_note" | "invoice";

interface IssueRequest {
  orderIds: string[];
  type?: DocumentType;
}

interface OrderForDocument {
  id: string;
  status: string;
  delivery_date: string;
  note: string | null;
  updated_at: string;
  customer: { code: string; name: string } | null;
  order_lines: { sku: string | null; product_name: string; qty: number; unit_price: number }[];
}

/** ריווחית דחתה בקשה כפולה (‎-107) — התעודה התקינה כבר קיימת, ולכן לא רושמים שורת שגיאה
 * שתסתיר אותה ביומן; רק מחזירים הודעה לקורא. */
class AlreadyIssuedError extends Error {}

interface IssuedDocument {
  number: string;
  externalId: string | null;
  link: string | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RIVHIT_API_TOKEN = Deno.env.get("RIVHIT_API_TOKEN") ?? "";
const RIVHIT_URL = "https://api.rivhit.co.il/online/RivhitOnlineAPI.svc";

/** טוקן חברת הדמו הציבורית של ריווחית (סביבת הטסט) — כל מה שנשלח אליה גלוי לכל המפתחים,
 * לכן איתו לא שולחים שם לקוח או הערת הזמנה, גם אם ה-DB המקומי מכיל נתונים אמיתיים. */
const RIVHIT_PUBLIC_TEST_TOKEN = "DECD03E5-E35C-41E8-84F7-FBA2FB483928";
const IS_RIVHIT_TEST = RIVHIT_API_TOKEN.toUpperCase() === RIVHIT_PUBLIC_TEST_TOKEN;

/** סוג המסמך "תעודת משלוח" בריווחית. הצגת המחירים בתעודה נקבעת בהגדרות סוג המסמך בריווחית
 * עצמה (הגדרות ← סוגי מסמכים), לא בפרמטר של ה-API. */
const RIVHIT_DELIVERY_NOTE_TYPE = 4;

/** ריווחית מגבילה ל-200 בקשות בדקה — מפיקים בקבוצות קטנות ולא הכול במקביל. */
const ISSUE_BATCH_SIZE = 5;

// הדפדפן שולח preflight (OPTIONS) לפני כל קריאה אמיתית — בלי הכותרות האלה הדפדפן חוסם
// את הבקשה עוד לפני שהיא יוצאת, בלי קשר להרשאות בפועל (שנאכפות ע"י verify_jwt + RLS).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** קריאת REST אל PostgREST תחת ה-JWT של הקורא (לא service_role) — RLS על documents/orders
 * אוכפת הרשאות בפועל, לא רק ה-verify_jwt הכללי שנבדק לפני שהקוד מתחיל לרוץ. */
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

async function loadOrder(authHeader: string, orderId: string): Promise<OrderForDocument> {
  const select =
    "id,status,delivery_date,note,updated_at,customer:customers(code,name),order_lines(sku,product_name,qty,unit_price)";
  const rows = (await postgrest(
    `orders?id=eq.${encodeURIComponent(orderId)}&select=${select}`,
    authHeader,
  )) as OrderForDocument[];
  const order = rows[0];
  if (!order) throw new Error("ההזמנה לא נמצאה");
  return order;
}

/** `2026-11-13` ← `13/11/2026` (פורמט התאריך של ריווחית). */
function toRivhitDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

const isDigits = (value: string) => /^\d+$/.test(value);

/** בונה את גוף `Document.New` — זורק שגיאה בעברית אם ההזמנה לא ניתנת להפקה. */
function buildDeliveryNote(order: OrderForDocument) {
  if (order.status !== "approved" && order.status !== "completed") {
    throw new Error(
      order.status === "cancelled" ? "ההזמנה בוטלה — אין להפיק לה תעודה" : "ההזמנה עוד לא נשלחה",
    );
  }
  const code = order.customer?.code.trim() ?? "";
  if (!isDigits(code)) throw new Error(`קוד הלקוח "${code}" אינו מספר לקוח תקין בריווחית`);
  if (order.order_lines.length === 0) throw new Error("אין מוצרים בהזמנה");
  const missingSku = order.order_lines.find((l) => !l.sku || !isDigits(l.sku.trim()));
  if (missingSku) throw new Error(`למוצר "${missingSku.product_name}" אין מק"ט תקין`);

  return {
    api_token: RIVHIT_API_TOKEN,
    document_type: RIVHIT_DELIVERY_NOTE_TYPE,
    customer_id: Number(code),
    last_name: IS_RIVHIT_TEST ? "לקוח בדיקה" : (order.customer?.name ?? "").slice(0, 30),
    issue_date: toRivhitDate(order.delivery_date),
    // המחירים אצלנו תמיד לפני מע"מ (כלל ברזל 6) — ריווחית מוסיפה את המע"מ במסמך.
    price_include_vat: false,
    currency_id: 1,
    ...(order.note && !IS_RIVHIT_TEST ? { comments: order.note.slice(0, 400) } : {}),
    order: order.id.slice(0, 8),
    // שורה לכל מוצר באפליקציה, גם כשכמה מוצרים חולקים מק"ט אחד בריווחית (בגלה בצל/פרג = 1160)
    // — השם והמחיר שלנו נשמרים כפי שהלקוח הזמין (החלטה 23). המק"ט אצלנו = "מס' פריט" בריווחית,
    // שהוא `item_id` (שדה המק"ט/`item_part_num` ריק אצל המאפייה). מספר שלא קיים ← שגיאה ‎-24
    // ברורה, ולא נפילה שקטה לפריט "כללי" כמו ב-`catalog_number`.
    items: order.order_lines.map((l) => ({
      item_id: Number((l.sku ?? "").trim()),
      description: l.product_name.slice(0, 100),
      quantity: Number(l.qty),
      price_nis: Number(l.unit_price),
      currency_id: 1,
    })),
    // לא שולחים מייל ללקוח מריווחית (ברירת המחדל שם היא כן).
    send_mail: false,
    // מלאי אפס/שלילי בריווחית לא יחסום הפקה — במאפייה אין מעקב מלאי מדויק.
    reject_item_quantity: false,
    // אותה הזמנה בלי שינוי ← אותו מזהה, וריווחית דוחה כפילות (‎-107). הזמנה שנערכה מקבלת
    // מזהה חדש ← תעודה חדשה; את הישנה המנהל מבטל ידנית בריווחית (החלטה 23).
    request_reference: `${order.id}:${order.updated_at}`,
    prevent_duplicates: true,
  };
}

/** התעודה האחרונה (לא מבוטלת) בריווחית לאותו לקוח, תאריך ושדה "הזמנה" — או null. */
async function findExistingDeliveryNote(
  body: ReturnType<typeof buildDeliveryNote>,
): Promise<IssuedDocument | null> {
  try {
    const res = await fetch(`${RIVHIT_URL}/Document.List`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        api_token: RIVHIT_API_TOKEN,
        from_document_type: body.document_type,
        to_document_type: body.document_type,
        from_customer_id: body.customer_id,
        to_customer_id: body.customer_id,
        from_date: body.issue_date,
        to_date: body.issue_date,
        filter_fields: [{ filter_field: "order", filter_value: body.order }],
      }),
    });
    const data = (await res.json()) as {
      error_code?: number;
      data?: { document_list?: { document_number: number; is_cancelled: boolean; order: string }[] };
    };
    const matches = (data.data?.document_list ?? []).filter(
      (d) => !d.is_cancelled && d.order === body.order,
    );
    const latest = matches.sort((a, b) => b.document_number - a.document_number)[0];
    return latest ? { number: String(latest.document_number), externalId: null, link: null } : null;
  } catch {
    return null;
  }
}

/** מתאם ריווחית: `Document.New` אחת להזמנה. היקף שלב א׳ — תעודות משלוח בלבד (PRD §2.8). */
async function issueWithRivhit(
  authHeader: string,
  orderId: string,
  type: DocumentType,
): Promise<IssuedDocument> {
  if (type !== "delivery_note") throw new Error("הפקת חשבוניות אינה נתמכת עדיין");
  if (!RIVHIT_API_TOKEN) throw new Error("החיבור לריווחית לא הוגדר (חסר מפתח API)");

  const body = buildDeliveryNote(await loadOrder(authHeader, orderId));
  const res = await fetch(`${RIVHIT_URL}/Document.New`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: {
    error_code?: number;
    client_message?: string;
    debug_message?: string;
    data?: { document_number?: number; document_identity?: string; document_link?: string } | null;
  } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`תשובה לא תקינה מריווחית (${res.status})`);
  }

  if (data?.error_code === -107) {
    // התעודה כבר קיימת בריווחית (לחיצה כפולה, או הפקה שהצליחה שם אבל השמירה אצלנו נכשלה) —
    // מאתרים אותה לפי שדה "הזמנה" כדי לרשום את המספר האמיתי במקום להיתקע בשגיאה.
    const existing = await findExistingDeliveryNote(body);
    if (existing) return existing;
    throw new AlreadyIssuedError("תעודה להזמנה זו (בלי שינויים מאז) כבר הופקה בריווחית");
  }
  if (!data || data.error_code !== 0 || !data.data?.document_number) {
    const message = data?.client_message || data?.debug_message || `שגיאת ריווחית (${res.status})`;
    throw new Error(`ריווחית: ${message}`);
  }
  return {
    number: String(data.data.document_number),
    externalId: data.data.document_identity ?? null,
    link: data.data.document_link ?? null,
  };
}

async function insertDocument(authHeader: string, row: Record<string, unknown>) {
  const [doc] = await postgrest("documents", authHeader, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return doc;
}

async function issueOne(authHeader: string, orderId: string, type: DocumentType) {
  try {
    const issued = await issueWithRivhit(authHeader, orderId, type);
    // תעודה שכבר רשומה אצלנו (לחיצה כפולה שאותרה בריווחית) — לא רושמים אותה פעמיים.
    const [known] = (await postgrest(
      `documents?order_id=eq.${encodeURIComponent(orderId)}&status=eq.issued&number=eq.${encodeURIComponent(issued.number)}&select=*`,
      authHeader,
    )) as unknown[];
    if (known) return known;
    return await insertDocument(authHeader, {
      order_id: orderId,
      type,
      status: "issued",
      number: issued.number,
      external_id: issued.externalId,
      link: issued.link,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ההפקה נכשלה";
    if (err instanceof AlreadyIssuedError) return { order_id: orderId, type, status: "error", error: message };
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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: IssueRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds.filter((id) => typeof id === "string")
    : [];
  const type: DocumentType = body.type === "invoice" ? "invoice" : "delivery_note";

  const authHeader = req.headers.get("Authorization") ?? "";

  // הפקה בריווחית היא פעולה חיצונית שאי אפשר להחזיר — לכן הרשאת מנהל נבדקת *לפני* כל פנייה
  // לריווחית, ולא רק כשה-RLS של `documents` חוסם את השמירה אחריה (לקוח קורא את ההזמנות של
  // עצמו, כך שבלי הבדיקה הזו הוא היה מצליח להפיק לעצמו תעודה בריווחית).
  let isAdmin = false;
  try {
    isAdmin = (await postgrest("rpc/fn_is_admin", authHeader, { method: "POST", body: "{}" })) === true;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: unknown[] = [];
  for (let i = 0; i < orderIds.length; i += ISSUE_BATCH_SIZE) {
    const batch = orderIds.slice(i, i + ISSUE_BATCH_SIZE);
    results.push(...(await Promise.all(batch.map((id) => issueOne(authHeader, id, type)))));
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
