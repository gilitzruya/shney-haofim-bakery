/** מנקה מספר טלפון ישראלי לפורמט בינלאומי E.164, כמו שה-API של Supabase Auth מצפה. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}
