import { israelNow } from "@/lib/cutoff";
import { toIso } from "@/lib/format";

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
