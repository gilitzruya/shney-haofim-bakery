import type { RecurringOrder } from "@/data/seed";
import { israelNow } from "@/lib/cutoff";
import { nextOccurrence, parseDate } from "@/lib/format";

/** מועד האספקה הבא של הזמנה קבועה, בהתחשב בתאריך ההתחלה שנבחר. */
export function nextRecurringDelivery(rec: RecurringOrder): string | null {
  const now = israelNow();
  if (rec.startDate && parseDate(rec.startDate).getTime() > now.getTime()) return rec.startDate;
  return nextOccurrence(rec.weekdays, now);
}
