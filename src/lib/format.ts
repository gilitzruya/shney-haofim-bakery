import { findProduct } from "@/data/catalog";
import type { OrderLine } from "@/data/seed";

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

export function formatQty(qty: number, unit: "unit" | "kg"): string {
  return unit === "kg" ? qty.toFixed(1) : `${Math.round(qty)}`;
}

export function unitLabel(unit: "unit" | "kg"): string {
  return unit === "kg" ? 'ק"ג' : "יחידה";
}

export function priceLabel(price: number, unit: "unit" | "kg"): string {
  return `${price.toFixed(2)} ₪ ל${unitLabel(unit)}`;
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

export function stepFor(unit: "unit" | "kg"): number {
  return unit === "kg" ? 0.1 : 1;
}

export function quickStepFor(unit: "unit" | "kg"): number {
  return unit === "kg" ? 0.5 : 5;
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
