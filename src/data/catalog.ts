export type Unit = "unit" | "kg";

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  price: number;
  /** Minimum orderable quantity. */
  minQty: number;
  /** Regular +1 / -1 increment. */
  step: number;
  /** Quick-add (+N) increment. */
  quickAdd: number;
  available: boolean;
  unavailableReason?: string;
  /** Optional catalog item code (falls back to id). */
  sku?: string;
  /** Optional item weight in grams. */
  weightGrams?: number;
  /** Optional product note shown on the card. */
  note?: string;
  /** Optional uploaded product photo (data URL or remote URL). */
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export const ROUNDS = [
  { id: "morning", label: "סבב ראשון", time: "04:00 – 06:00" },
  { id: "noon", label: "סבב שני", time: "10:00 – 12:00" },
] as const;

export type RoundId = (typeof ROUNDS)[number]["id"];

export const WEEKDAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/**
 * הקטלוג הפעיל נטען מ-Supabase (`useCatalog`, `src/hooks/use-catalog.ts`) ומוזן לכאן.
 * האינדקס הגלובלי הזה קיים כי `findProduct` נצרך גם מחוץ ל-React — ב-`app-store.tsx`'s
 * `bumpQty`/`setQty` וב-`lib/format.ts`'s `linesTotal` — שעדיין לא עברו ל-DB (שלב 3).
 */
let runtimeCategories: Category[] = [];
let productIndex = new Map<string, Product>();

export function applyRuntimeCatalog(categories: Category[]): void {
  runtimeCategories = categories;
  productIndex = new Map(categories.flatMap((c) => c.products).map((p) => [p.id, p]));
}

export function catalogCategories(): Category[] {
  return runtimeCategories;
}

export function allProducts(): Product[] {
  return runtimeCategories.flatMap((c) => c.products);
}

export function findProduct(id: string): Product | undefined {
  return productIndex.get(id);
}

export function roundLabel(id: RoundId | string): string {
  return ROUNDS.find((r) => r.id === id)?.label ?? "";
}

export const BAKERY_CONTACT = {
  name: "מאפיית שני האופים",
  phone: "0528880383",
  whatsapp: "0528880383",
  email: "avimich@012.net.il",
  address: "המע\"ש, אזור התעשייה עטרות",
  hours: [
    { day: "ראשון – חמישי", time: "05:00 – 17:00" },
    { day: "שישי וערבי חג", time: "05:00 – 13:00" },
    { day: "שבת", time: "סגור" },
  ],
};
