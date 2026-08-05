import { parseDate } from "@/lib/format";

/** שעת סגירת ההזמנות */
export const CUTOFF_HOUR = 14;

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/**
 * מועד סגירת ההזמנות עבור תאריך אספקה:
 * יום לפני האספקה בשעה 14:00, ולאספקה ביום ראשון — יום חמישי בשעה 14:00.
 */
export function cutoffFor(deliveryIso: string): Date {
  const delivery = parseDate(deliveryIso);
  const cutoff = new Date(delivery);
  cutoff.setDate(delivery.getDate() - (delivery.getDay() === 0 ? 3 : 1));
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  return cutoff;
}

export function isCutoffPassed(deliveryIso: string, now = new Date()): boolean {
  return now.getTime() > cutoffFor(deliveryIso).getTime();
}

/** "יום חמישי, 6.8 בשעה 14:00" */
export function formatCutoff(deliveryIso: string): string {
  const c = cutoffFor(deliveryIso);
  return `יום ${HE_DAYS[c.getDay()]}, ${c.getDate()}.${c.getMonth() + 1} בשעה ${CUTOFF_HOUR}:00`;
}
