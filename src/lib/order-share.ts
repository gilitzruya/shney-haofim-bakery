import { STATUS_LABELS } from "@/components/app/status-chip";
import { roundLabel } from "@/data/catalog";
import type { Order } from "@/hooks/use-orders";
import { formatLongDate, formatPrice, formatQty, orderNumberLabel } from "@/lib/format";

/** איפה נפתחת טיוטת המייל: Gmail בדפדפן, Outlook בדפדפן, או תוכנת המייל של המחשב (mailto). */
export type MailTarget = "gmail" | "outlook" | "mailto";
/** כל יעדי השיתוף: המייל, ווואטסאפ (wa.me — הלקוח בוחר איש קשר). */
export type ShareTarget = MailTarget | "whatsapp";

export const MAIL_TARGET_LABELS: Record<MailTarget, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  mailto: "תוכנת המייל במחשב",
};

/**
 * אורך קישור מרבי לכל יעד, לפי מדידה (11/2026, טקסט עברי דמה): Gmail עבר ב-7,800 ונדחה
 * (400) ב-9,000; Outlook קיבל 20,000; wa.me קיבל 30,000 והעביר את הטקסט שלם. mailto עובר
 * דרך ווינדוס לתוכנה המותקנת, שחותכת בסביבות 2,000 (לא נמדד). אות עברית מקודדת היא 6 תווים:
 * כותרת ההזמנה ≈ 700 ומוצר ≈ 190 — כלומר Gmail כ-34 מוצרים, Outlook/וואטסאפ כ-73, mailto כ-4.
 */
const MAX_URL_LENGTH: Record<ShareTarget, number> = {
  gmail: 7500,
  outlook: 15000,
  whatsapp: 15000,
  mailto: 1800,
};

/** גוף מקוצר כשההזמנה ארוכה מדי לקישור — הטקסט המלא מועתק ללוח. */
export const PASTE_HINT = "פירוט ההזמנה הועתק — לחצו כאן ואז Ctrl+V (או קליק ימני ← הדבקה)";

/**
 * טקסט ההזמנה — אותם נתונים כמו בגיליון ההדפסה (`OrderSheet`). `bold` עוטף כותרות, שמות
 * מוצרים וכמויות: בוואטסאפ `*טקסט*` מודגש; במייל אין הדגשה — טיוטה שנפתחת מקישור היא טקסט
 * פשוט בלבד, ותווי "בולד" של יוניקוד קיימים רק לאותיות לטיניות וספרות, לא לעברית.
 */
function orderText(
  order: Order,
  customerName: string,
  showRound: boolean,
  bold: (s: string) => string,
): string {
  const total = order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const delivery = order.date
    ? `${formatLongDate(order.date)}${showRound ? ` · ${roundLabel(order.round)}` : ""}`
    : "טרם נבחר";

  // טבלה מיושרת אי אפשר בטקסט פשוט (גופן ברוחב משתנה, והצד המקבל מציג אחרת) — לכן כל מוצר
  // בשתי שורות: שם וקוד, ומתחתיו המספרים באותו סדר תמיד. בלי הזחה: רווחים מובילים נבלעים.
  // קוד פריט בניסוח קצר "(קוד 15)" — כל תו עברי עולה 6 בקישור. היחידה ("יח׳"/"ק"ג") נשארת
  // בכוונה: היא האות העברית היחידה בשורת המספרים, ובלעדיה תוכנת המייל/וואטסאפ מציגים את
  // השורה משמאל לימין. מאותה סיבה "×" (ניטרלי) ולא "x" לטיני, שהופך את סדר הקריאה.
  const lines = order.lines.flatMap((l) => [
    l.sku ? `${bold(l.productName)} (קוד ${l.sku})` : bold(l.productName),
    `${bold(`${formatQty(l.qty, l.unit)} ${l.unit === "kg" ? 'ק"ג' : "יח׳"}`)} × ${formatPrice(l.unitPrice)} = ${formatPrice(l.qty * l.unitPrice)}`,
    "",
  ]);

  return [
    bold(`${orderNumberLabel(order.number)} — מאפיית שני האופים`),
    `לקוח: ${customerName}`,
    ...(order.branch ? [`סניף: ${order.branch.name}`] : []),
    `מועד אספקה: ${delivery}`,
    `סטטוס: ${STATUS_LABELS[order.status]}`,
    "",
    bold(`${order.lines.length} מוצרים:`),
    "",
    ...lines,
    bold(`סה״כ (לפני מע״מ): ${formatPrice(total)}`),
    ...(order.note ? [`הערה למאפייה: ${order.note}`] : []),
  ].join("\n");
}

/** נושא וגוף טקסט של מייל הזמנה. */
export function orderEmailText(
  order: Order,
  customerName: string,
  showRound: boolean,
): { subject: string; body: string } {
  return {
    subject: `${orderNumberLabel(order.number)} — מאפיית שני האופים`,
    body: orderText(order, customerName, showRound, (s) => s),
  };
}

/** הודעת וואטסאפ של הזמנה — כותרות ושמות מוצרים מודגשים. */
export function orderWhatsappText(order: Order, customerName: string, showRound: boolean): string {
  return orderText(order, customerName, showRound, (s) => `*${s}*`);
}

function buildUrl(target: ShareTarget, subject: string, body: string): string {
  const su = encodeURIComponent(subject);
  switch (target) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${encodeURIComponent(body)}`;
    case "outlook":
      return `https://outlook.office.com/mail/deeplink/compose?subject=${su}&body=${encodeURIComponent(body)}`;
    case "mailto":
      // RFC 6068: שבירת שורה בגוף mailto היא CRLF.
      return `mailto:?subject=${su}&body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`;
    case "whatsapp":
      // בלי מספר — וואטסאפ (אפליקציה / Web / Desktop) נפתח עם ההודעה והלקוח בוחר למי לשלוח.
      return `https://wa.me/?text=${encodeURIComponent(body)}`;
  }
}

/**
 * קישור לשיתוף. אם הגוף המלא חורג מאורך הקישור של היעד — `url` נושא את `PASTE_HINT`
 * ו-`needsPaste` דולק, והקורא אחראי להעתיק את `body` המלא ללוח. `fullUrl` תמיד עם הגוף המלא
 * (גיבוי כשההעתקה נכשלה — עדיף טקסט שאולי ייחתך מהודעה ריקה). `subject` — למייל בלבד.
 */
export function composeUrl(
  target: ShareTarget,
  subject: string,
  body: string,
): { url: string; fullUrl: string; needsPaste: boolean } {
  const fullUrl = buildUrl(target, subject, body);
  if (fullUrl.length <= MAX_URL_LENGTH[target]) return { url: fullUrl, fullUrl, needsPaste: false };
  return { url: buildUrl(target, subject, PASTE_HINT), fullUrl, needsPaste: true };
}
