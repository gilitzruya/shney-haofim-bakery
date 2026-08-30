import type { RecurringOrder } from "@/hooks/use-recurring";
import { isCutoffPassed, israelNow } from "@/lib/cutoff";
import { nextOccurrence, parseDate } from "@/lib/format";

/** מועד האספקה הבא של הזמנה קבועה, בהתחשב בתאריך ההתחלה שנבחר. */
export function nextRecurringDelivery(rec: Pick<RecurringOrder, "weekdays" | "startDate">): string | null {
  const now = israelNow();
  if (rec.startDate && parseDate(rec.startDate).getTime() > now.getTime()) return rec.startDate;
  return nextOccurrence(rec.weekdays, now);
}

/** כמו `nextRecurringDelivery`, אבל מדלג על מופע שה-cutoff שלו כבר חלף — האספקה הזו כבר
 * "ננעלה" (PRD §2.4: עריכת התבנית משפיעה קדימה בלבד). משמש להצגת "השינוי יחול החל
 * מהאספקה הבאה בתאריך X" במסך העריכה. */
export function nextEditableDelivery(rec: Pick<RecurringOrder, "weekdays" | "startDate">): string | null {
  const first = nextRecurringDelivery(rec);
  if (!first || !isCutoffPassed(first)) return first;
  return nextOccurrence(rec.weekdays, parseDate(first));
}
