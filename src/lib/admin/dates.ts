import { israelNow } from "@/lib/cutoff";
import { parseDate, toIso } from "@/lib/format";

/** מזיז תאריך ISO במספר ימים. */
export function shiftIso(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** תאריך יחסי להיום (לפי שעון ישראל) בפורמט ISO. */
export function isoFromToday(offsetDays: number): string {
  const d = israelNow();
  d.setDate(d.getDate() + offsetDays);
  return toIso(d);
}

/** תאריך האספקה של מחר. */
export function tomorrowIso(): string {
  return isoFromToday(1);
}
