import type { Customer } from "@/data/admin-seed";
import type { Product } from "@/data/catalog";
import { findProduct } from "@/data/catalog";
import type { OrderLine } from "@/data/seed";

/** מחיר בפועל ללקוח: מחיר מיוחד אם קיים, אחרת מחיר הקטלוג. */
export function priceFor(customer: Customer | undefined, product: Product): number {
  const override = customer?.priceOverrides?.[product.id];
  return typeof override === "number" ? override : product.price;
}

export function hasOverride(customer: Customer | undefined, productId: string): boolean {
  return typeof customer?.priceOverrides?.[productId] === "number";
}

/** סה״כ שורות לפי תמחור הלקוח. */
export function linesTotalFor(lines: OrderLine[], customer: Customer | undefined): number {
  return lines.reduce((sum, l) => {
    const p = findProduct(l.productId);
    return p ? sum + priceFor(customer, p) * l.qty : sum;
  }, 0);
}

export interface OverrideEntry {
  product: Product;
  price: number;
}

/** רשימת החריגות של הלקוח בלבד, ממוינת לפי שם המוצר. */
export function overrideEntries(customer: Customer | undefined): OverrideEntry[] {
  return overrideEntriesFromMap(customer?.priceOverrides);
}

/** רשימת חריגות מתוך מפת מחירים (גם ללקוח שטרם נשמר). */
export function overrideEntriesFromMap(map: Record<string, number> | undefined): OverrideEntry[] {
  return Object.entries(map ?? {})
    .map(([productId, price]) => {
      const product = findProduct(productId);
      return product ? { product, price } : null;
    })
    .filter((e): e is OverrideEntry => e !== null)
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "he"));
}
