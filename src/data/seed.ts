/** צורת שורת פריטים גנרית ({productId, qty}, בלי מחיר) — משותפת לכמה מקומות שמציגים
 * רשימת מוצרים+כמויות מול הקטלוג החי (`findProduct`), כמו `linesTotal`/`linesCount`
 * ב-`src/lib/format.ts`. שולי מ-`data/seed.ts` היסטורית — הזמנות/הזמנות קבועות עצמן
 * חיות כולן ב-Supabase (`use-orders.ts`/`use-recurring.ts`). */
export interface OrderLine {
  productId: string;
  qty: number;
}
