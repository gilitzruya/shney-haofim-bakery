import type { Product } from "@/data/catalog";
import { findProduct } from "@/data/catalog";

/** מחיר בפועל ללקוח: מחיר מיוחד אם קיים (productId → price), אחרת מחיר הקטלוג. */
export function priceFor(product: Product, overrides: Record<string, number> | undefined): number {
  const override = overrides?.[product.id];
  return typeof override === "number" ? override : product.price;
}

export function hasOverride(overrides: Record<string, number> | undefined, productId: string): boolean {
  return typeof overrides?.[productId] === "number";
}

/** סה״כ שורות (טרם נשמרו) לפי תמחור הלקוח — לתצוגה מקדימה בלבד, לפני יצירת ההזמנה.
 * להזמנה קיימת יש לקרוא את ה-snapshot (`order_lines.unit_price`) ישירות, לא לחשב מחדש. */
export function linesTotalFor(
  lines: { productId: string; qty: number }[],
  overrides: Record<string, number> | undefined,
): number {
  return lines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + priceFor(p, overrides) * l.qty : sum;
  }, 0);
}

export interface OverrideEntry {
  product: Product;
  price: number;
}

/** רשימת חריגות מתוך מפת מחירים (productId → price), ממוינת לפי שם המוצר. */
export function overrideEntriesFromMap(map: Record<string, number> | undefined): OverrideEntry[] {
  return Object.entries(map ?? {})
    .map(([productId, price]) => {
      const product = findProduct(productId);
      return product ? { product, price } : null;
    })
    .filter((e): e is OverrideEntry => e !== null)
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "he"));
}
