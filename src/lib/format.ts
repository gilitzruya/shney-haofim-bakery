import { findProduct } from "@/data/catalog";

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HE_MONTHS = [
  "בינואר",
  "בפברואר",
  "במרץ",
  "באפריל",
  "במאי",
  "ביוני",
  "ביולי",
  "באוגוסט",
  "בספטמבר",
  "באוקטובר",
  "בנובמבר",
  "בדצמבר",
];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return value;
}

export function toIso(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "3 באוגוסט 2026" */
export function formatDate(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "3.8" */
export function formatShortDateNumeric(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/** "יום שני, 3 באוגוסט 2026" */
export function formatLongDate(iso: string): string {
  const d = parseDate(iso);
  return `יום ${HE_DAYS[d.getDay()]}, ${formatDate(iso)}`;
}

/** "יום שני" */
export function formatWeekday(iso: string): string {
  return `יום ${HE_DAYS[parseDate(iso).getDay()]}`;
}

export function formatPrice(value: number): string {
  return `${value.toFixed(2)} ₪`;
}

/** "14:32" — שעה בפורמט ישראל, מתוך חותמת זמן ISO (למשל `orders.created_at`). */
export function formatIsraelTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoTimestamp));
}

export function formatQty(qty: number, unit: "unit" | "kg"): string {
  return unit === "kg" ? qty.toFixed(1) : `${Math.round(qty)}`;
}

export function unitLabel(unit: "unit" | "kg"): string {
  return unit === "kg" ? 'ק"ג' : "יחידה";
}

/** צורת שורת פריטים גנרית ({productId, qty}, בלי מחיר) — משמשת מול הקטלוג החי
 * (`findProduct`) ב-`linesTotal`/`linesCount` למטה ובתצוגת "העתקת הזמנה קודמת". */
export interface OrderLine {
  productId: string;
  qty: number;
}

export function priceLabel(price: number, unit: "unit" | "kg"): string {
  return `${price.toFixed(2)} ₪ ל${unitLabel(unit)}`;
}

export function weightLabel(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} ק"ג` : `${grams} גרם`;
}

export function linesTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + p.price * l.qty : sum;
  }, 0);
}

export function linesCount(lines: OrderLine[]): number {
  return lines.filter((l) => l.qty > 0).length;
}

export function stepFor(product: { unit: "unit" | "kg"; step?: number }): number {
  return product.step ?? (product.unit === "kg" ? 0.5 : 1);
}

export function minQtyFor(product: { unit: "unit" | "kg"; minQty?: number }): number {
  return product.minQty ?? (product.unit === "kg" ? 0.5 : 1);
}

/** Clamp a typed/derived quantity: below the minimum collapses to 0. */
export function clampQty(
  product: { unit: "unit" | "kg"; minQty?: number },
  qty: number,
): number {
  const min = minQtyFor(product);
  const rounded = roundQty(qty, product.unit);
  if (rounded <= 0) return 0;
  return rounded < min ? min : rounded;
}

export function roundQty(qty: number, unit: "unit" | "kg"): number {
  return unit === "kg" ? Math.max(0, Math.round(qty * 10) / 10) : Math.max(0, Math.round(qty));
}

export function weekdaysLabel(days: number[]): string {
  const labels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => labels[d])
    .join(", ");
}

/** Next date matching one of the given weekdays, starting from the demo "today". */
export function nextOccurrence(weekdays: number[], from = new Date(2026, 7, 3)): string | null {
  if (!weekdays.length) return null;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    if (weekdays.includes(d.getDay())) return toIso(d);
  }
  return null;
}
