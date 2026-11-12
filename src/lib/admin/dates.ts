import { isBusinessDay, type CutoffException, type CutoffRule } from "@/lib/admin/cutoff-rules";
import { israelNow, israelPartsFromIso } from "@/lib/cutoff";
import { formatShortDateNumeric, parseDate, toIso } from "@/lib/format";

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

/** כמה ימים קדימה מחפשים יום עסקים לפני שנופלים ל"מחר" (הגדרות חריגות, למשל כל השבוע סגור). */
const BUSINESS_DAY_SEARCH_DAYS = 14;

/**
 * תאריך יום העסקים הבא, החל ממחר (לא מהיום): שישי ומוצ"ש ← ראשון, וערב חג ← היום שאחרי החג.
 * "יום עסקים" נגזר ממה שבעל המאפייה מגדיר במסך שעות הסגירה (ראו `isBusinessDay`).
 * `from` — לבדיקות בלבד; ברירת המחדל היא היום לפי שעון ישראל.
 */
export function nextBusinessDayIso(
  rules: CutoffRule[],
  exceptions: CutoffException[],
  from: Date = israelNow(),
): string {
  for (let offset = 1; offset <= BUSINESS_DAY_SEARCH_DAYS; offset++) {
    const day = new Date(from);
    day.setDate(from.getDate() + offset);
    const iso = toIso(day);
    if (isBusinessDay(iso, day.getDay(), rules, exceptions)) return iso;
  }
  const fallback = new Date(from);
  fallback.setDate(from.getDate() + 1);
  return toIso(fallback);
}

/** כמה זמן הזמנה נחשבת "חדשה" בפיד ההזמנות האחרונות (PRD החלטה 21). */
export const NEW_ORDER_WINDOW_MS = 60 * 60 * 1000;

/** האם ההזמנה נוצרה בשעה האחרונה. משווה בין שתי נקודות זמן, ולכן לא תלוי באזור זמן. */
export function isNewOrder(createdAtIso: string, nowMs: number = Date.now()): boolean {
  const age = nowMs - new Date(createdAtIso).getTime();
  return age >= 0 && age < NEW_ORDER_WINDOW_MS;
}

/** יום יצירת ההזמנה ביחס להיום (לפי שעון ישראל): "היום" / "אתמול" / "שלשום", ואחרת תאריך ("8.11",
 * ועם שנה אם היא לא השנה הנוכחית). */
export function intakeDayLabel(createdAtIso: string): string {
  const day = israelPartsFromIso(createdAtIso).date;
  if (day === isoFromToday(0)) return "היום";
  if (day === isoFromToday(-1)) return "אתמול";
  if (day === isoFromToday(-2)) return "שלשום";
  const short = formatShortDateNumeric(day);
  return day.slice(0, 4) === isoFromToday(0).slice(0, 4) ? short : `${short}.${day.slice(2, 4)}`;
}
