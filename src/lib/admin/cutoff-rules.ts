/** כללי שעת סגירה להזמנות — לכל יום אספקה בשבוע. */
export interface CutoffRule {
  /** יום האספקה: 0 = ראשון … 6 = שבת */
  weekday: number;
  /** האם ניתן להזמין ליום זה בכלל */
  enabled: boolean;
  /** כמה ימים לפני האספקה נסגרות ההזמנות */
  offsetDays: number;
  /** שעת הסגירה (0-23) */
  hour: number;
  /** דקת הסגירה (0-59) */
  minute: number;
}

export const HE_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/** ברירת המחדל: יום לפני בשעה 12:00, ולאספקה ביום ראשון — יום חמישי בשעה 12:00. */
export const DEFAULT_CUTOFF_RULES: CutoffRule[] = [
  { weekday: 0, enabled: true, offsetDays: 3, hour: 12, minute: 0 },
  { weekday: 1, enabled: true, offsetDays: 1, hour: 12, minute: 0 },
  { weekday: 2, enabled: true, offsetDays: 1, hour: 12, minute: 0 },
  { weekday: 3, enabled: true, offsetDays: 1, hour: 12, minute: 0 },
  { weekday: 4, enabled: true, offsetDays: 1, hour: 12, minute: 0 },
  { weekday: 5, enabled: true, offsetDays: 1, hour: 12, minute: 0 },
  { weekday: 6, enabled: false, offsetDays: 1, hour: 12, minute: 0 },
];

let runtimeRules: CutoffRule[] = DEFAULT_CUTOFF_RULES;

/** מחיל את הכללים ששמורים בסטור על שאר האפליקציה. */
export function applyRuntimeCutoffRules(rules: CutoffRule[] | undefined): void {
  runtimeRules = normalizeCutoffRules(rules);
}

export function cutoffRuleFor(weekday: number): CutoffRule {
  return runtimeRules[weekday] ?? DEFAULT_CUTOFF_RULES[weekday]!;
}

/** משלים כללים חסרים / לא תקינים מברירת המחדל. */
export function normalizeCutoffRules(rules: CutoffRule[] | undefined): CutoffRule[] {
  return DEFAULT_CUTOFF_RULES.map((fallback, i) => {
    const r = rules?.find((x) => x.weekday === i);
    if (!r) return fallback;
    return {
      weekday: i,
      enabled: r.enabled ?? fallback.enabled,
      offsetDays: clamp(Number(r.offsetDays), 0, 14, fallback.offsetDays),
      hour: clamp(Number(r.hour), 0, 23, fallback.hour),
      minute: clamp(Number(r.minute), 0, 59, fallback.minute),
    };
  });
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "יום חמישי בשעה 12:00" — תיאור הכלל ליום אספקה מסוים. */
export function describeRule(rule: CutoffRule): string {
  if (!rule.enabled) return "אין אספקה ביום זה";
  const cutoffDay = (rule.weekday - rule.offsetDays + 70) % 7;
  const when = rule.offsetDays === 0 ? "באותו יום" : `יום ${HE_WEEKDAYS[cutoffDay]}`;
  return `${when} בשעה ${formatTime(rule.hour, rule.minute)}`;
}

/** חריגה חד-פעמית לתאריך מסוים (חג, יום סגור, מועד סגירה מוקדם וכו'). */
export interface CutoffException {
  /** תאריך האספקה בפורמט ISO */
  date: string;
  /** שם/סיבה — לדוגמה "ערב פסח" */
  label: string;
  /** האם ניתן להזמין לתאריך זה בכלל */
  open: boolean;
  /** מועד סגירה מותאם (ISO) — אם ריק, נעשה שימוש בכלל השבועי */
  cutoffDate?: string | undefined;
  /** שעת סגירה מותאמת "HH:MM" — נדרש יחד עם cutoffDate */
  cutoffTime?: string | undefined;
}

let runtimeExceptions: CutoffException[] = [];

export function applyRuntimeCutoffExceptions(list: CutoffException[] | undefined): void {
  runtimeExceptions = [...(list ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

export function cutoffExceptionFor(deliveryIso: string): CutoffException | undefined {
  return runtimeExceptions.find((e) => e.date === deliveryIso);
}

