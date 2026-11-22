/**
 * הודעת שגיאה למשתמש מתוך כל מה שנזרק.
 *
 * שגיאת PostgREST (`{ code, message, details, hint }`) מוחזרת מ-supabase-js כאובייקט רגיל
 * ולא כ-Error, ולכן `err instanceof Error` מפספס אותה ומציג רק את הודעת ברירת המחדל —
 * למשל "אישור ההזמנה נכשל" במקום "המוצרים הבאים כבר לא זמינים: …". את ההודעה מהשרת
 * מציגים רק כשהיא שלנו (`raise exception` → קוד P0001, בעברית); שגיאות מערכת אחרות
 * (constraint, הרשאות) הן טכניות ובאנגלית, ולכן מוצגת עבורן ברירת המחדל.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (isPostgrestError(err))
    return err.code === "P0001" && err.message.trim() ? err.message : fallback;
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function isPostgrestError(err: unknown): err is { code: string; message: string } {
  if (typeof err !== "object" || err === null) return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}
