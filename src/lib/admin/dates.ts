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

/** שעת קליטה דמו יציבה לכל הזמנה (נגזרת מהמזהה, כדי לא לשבור הידרציה). */
export function intakeTime(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  const minutes = 8 * 60 + (hash % (9 * 60));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
