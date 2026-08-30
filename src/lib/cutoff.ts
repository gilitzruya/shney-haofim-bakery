import { parseDate } from "@/lib/format";
import { cutoffExceptionFor, cutoffRuleFor, formatTime } from "@/lib/admin/cutoff-rules";

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/**
 * מועד סגירת ההזמנות עבור תאריך אספקה — לפי כללי הסגירה שהוגדרו בניהול
 * (ברירת מחדל: יום לפני האספקה ב-12:00, ולאספקה ביום ראשון — יום חמישי ב-12:00).
 */
export function cutoffFor(deliveryIso: string): Date {
  const delivery = parseDate(deliveryIso);
  const exception = cutoffExceptionFor(deliveryIso);
  if (exception) {
    // תאריך סגור להזמנות — מועד הסגירה כבר מאחורינו תמיד.
    if (!exception.open) return new Date(1970, 0, 1);
    if (exception.cutoffDate) {
      const custom = parseDate(exception.cutoffDate);
      const [h, m] = (exception.cutoffTime ?? "12:00").split(":");
      custom.setHours(Number(h ?? 12), Number(m ?? 0), 0, 0);
      return custom;
    }
  }
  const rule = cutoffRuleFor(delivery.getDay());
  const cutoff = new Date(delivery);
  cutoff.setDate(delivery.getDate() - rule.offsetDays);
  cutoff.setHours(rule.hour, rule.minute, 0, 0);
  return cutoff;
}

export function isCutoffPassed(deliveryIso: string, now = israelNow()): boolean {
  return now.getTime() > cutoffFor(deliveryIso).getTime();
}

/** "יום חמישי, 6.8 בשעה 12:00" */
export function formatCutoff(deliveryIso: string): string {
  const c = cutoffFor(deliveryIso);
  return `יום ${HE_DAYS[c.getDay()]}, ${c.getDate()}.${c.getMonth() + 1} בשעה ${formatTime(c.getHours(), c.getMinutes())}`;
}


/** ה-offset (בדקות) של שעון ישראל מול UTC ברגע נתון — מתחשב בשעון קיץ. */
function israelOffsetMinutes(utc: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - utc.getTime()) / 60000);
}

/** ממיר תאריך ("YYYY-MM-DD") + שעה ("HH:MM") בשעון ישראל למחרוזת UTC ISO — לשמירת חריגת סגירה עם מועד מותאם. */
export function israelLocalToUtcIso(dateIso: string, time: string): string {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  let utcMs = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0);
  for (let i = 0; i < 2; i++) {
    const offset = israelOffsetMinutes(new Date(utcMs));
    utcMs = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0) - offset * 60000;
  }
  return new Date(utcMs).toISOString();
}

/** מפרק מחרוזת UTC ISO לתאריך+שעה בשעון ישראל — לעריכה חוזרת של חריגת סגירה שנשמרה. */
export function israelPartsFromIso(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
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
