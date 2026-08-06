import { parseDate } from "@/lib/format";

/** שעת סגירת ההזמנות */
export const CUTOFF_HOUR = 12;

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/**
 * מועד סגירת ההזמנות עבור תאריך אספקה:
 * יום לפני האספקה בשעה 12:00, ולאספקה ביום ראשון — יום חמישי בשעה 12:00.
 */
export function cutoffFor(deliveryIso: string): Date {
  const delivery = parseDate(deliveryIso);
  const cutoff = new Date(delivery);
  cutoff.setDate(delivery.getDate() - (delivery.getDay() === 0 ? 3 : 1));
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  return cutoff;
}

export function isCutoffPassed(deliveryIso: string, now = israelNow()): boolean {
  return now.getTime() > cutoffFor(deliveryIso).getTime();
}

/** "יום חמישי, 6.8 בשעה 12:00" */
export function formatCutoff(deliveryIso: string): string {
  const c = cutoffFor(deliveryIso);
  return `יום ${HE_DAYS[c.getDay()]}, ${c.getDate()}.${c.getMonth() + 1} בשעה ${CUTOFF_HOUR}:00`;
}

/** השעה הנוכחית לפי שעון ישראל (כאובייקט Date בשעון מקומי-וירטואלי) */
export function israelNow(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const d = new Date(2000, 0, 1);
  d.setFullYear(get("year"), get("month") - 1, get("day"));
  d.setHours(get("hour") % 24, get("minute"), get("second"), 0);
  return d;
}

export interface StartOption {
  iso: string;
  /** מועד הסגירה לאספקה זו כבר חלף */
  blocked: boolean;
}

/**
 * מועדי האספקה הקרובים לימים שנבחרו, עם סימון האם מועד הסגירה כבר חלף.
 */
export function upcomingStartOptions(weekdays: number[], count = 4): StartOption[] {
  if (!weekdays.length) return [];
  const now = israelNow();
  const out: StartOption[] = [];
  for (let i = 1; i <= 21 && out.length < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (!weekdays.includes(d.getDay())) continue;
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    const iso = `${d.getFullYear()}-${m}-${day}`;
    out.push({ iso, blocked: isCutoffPassed(iso, now) });
  }
  return out;
}
