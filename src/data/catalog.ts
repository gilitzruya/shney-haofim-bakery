export type Unit = "unit" | "kg";

/** מחלקה במאפייה (PRD החלטה 26) — לכל מחלקה דוח ייצור נפרד. הסדר כאן הוא סדר הדפים בדוח
 * הייצור וסדר המוצרים בדף הליקוט. `none` = מוצר שמגיע מוכן: לא בדוח הייצור, כן בליקוט. */
export const DEPARTMENTS = [
  { id: "production", label: "ייצור", reportTitle: "דוח ייצור" },
  { id: "cakes", label: "עוגות ומאפים", reportTitle: "דוח עוגות ומאפים" },
  { id: "baked_frozen", label: "אפוי-קפוא", reportTitle: "דוח אפוי-קפוא" },
  { id: "engel", label: "אנגל", reportTitle: "דוח אנגל" },
  { id: "none", label: "מוכן (לא בדוחות)", reportTitle: "מוצרים מוכנים" },
] as const;

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];

export function departmentLabel(id: DepartmentId): string {
  return DEPARTMENTS.find((d) => d.id === id)?.label ?? "";
}

export interface Product {
  id: string;
  name: string;
  /** מחלקה במאפייה — קובעת באיזה דוח ייצור המוצר מופיע. */
  department: DepartmentId;
  unit: Unit;
  price: number;
  /** Minimum orderable quantity. */
  minQty: number;
  /** Regular +1 / -1 increment. */
  step: number;
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
 * האינדקס הגלובלי הזה קיים כי `findProduct` נצרך גם מחוץ ל-React — ב-`lib/format.ts`'s
 * `linesTotal`, וב-`lib/admin/pricing.ts`/`lib/admin/reports.ts` בצד הניהול.
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
