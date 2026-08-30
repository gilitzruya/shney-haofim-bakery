import type { Product } from "@/data/catalog";
import { findProduct } from "@/data/catalog";

/** מחיר בפועל ללקוח: מחיר מיוחד אם קיים (productId → price), אחרת מחיר הקטלוג. */
export function priceFor(product: Product, overrides: Record<string, number> | undefined): number {
  const override = overrides?.[product.id];
  return typeof override === "number" ? override : product.price;
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
