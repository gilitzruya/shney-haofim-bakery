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

export const CATEGORIES: Category[] = [
  {
    id: "c1",
    name: "לחמים, בגטים וג׳בטות",
    products: [
      { id: "c1_1", name: "חצי בגט", sku: "3", unit: "unit", price: 3.9, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 250 },
      { id: "c1_2", name: "בגט ארוך", sku: "25", unit: "unit", price: 6.5, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 400 },
      { id: "c1_3", name: "בגט מחמצת", sku: "84", unit: "unit", price: 8.9, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 500 },
      { id: "c1_4", name: "בגטיה", sku: "22", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_5", name: "בגטינה", sku: "22", unit: "unit", price: 2.8, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_6", name: "כפרי קצר", sku: "30", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_7", name: "כפרי ארוך", sku: "5", unit: "unit", price: 14.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_8", name: "לחם הבית", sku: "1048", unit: "unit", price: 12.9, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 750 },
      { id: "c1_9", name: "לחם מחמצת", sku: "28", unit: "unit", price: 15.9, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 900, note: "מחמצת טבעית, זמן אפייה ארוך" },
      { id: "c1_10", name: "לחם ללא גלוטן", sku: "1155", unit: "unit", price: 18.9, minQty: 1, step: 1, quickAdd: 2, available: true, weightGrams: 500, note: "ללא גלוטן — מיוצר במתקן נפרד" },
      { id: "c1_11", name: "אש תנור", sku: "82", unit: "unit", price: 14.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_12", name: "פוקצ׳ה", sku: "1048", unit: "unit", price: 9.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_13", name: "לחם מלא פשוט", sku: "1086", unit: "unit", price: 12.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_14", name: "לחם שחור פרוס", sku: "21", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true, weightGrams: 500 },
      { id: "c1_15", name: "שומשום קצר", sku: "1", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c1_16", name: "שומשום ארוך", sku: "37", unit: "unit", price: 5.9, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c1_17", name: "קסטן", sku: "50", unit: "unit", price: 13.5, minQty: 1, step: 1, quickAdd: 5, available: true },
    ],
  },
  {
    id: "c2",
    name: "לחמניות וכריכים",
    products: [
      { id: "c2_1", name: "לחמניית שומשום", sku: "1", unit: "unit", price: 1.4, minQty: 1, step: 1, quickAdd: 25, available: true, weightGrams: 60 },
      { id: "c2_2", name: "לחמניית המבורגר", sku: "8", unit: "unit", price: 1.7, minQty: 1, step: 1, quickAdd: 16, available: true, weightGrams: 80 },
      { id: "c2_3", name: "מיני המבורגר", sku: "1060", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_4", name: "ביס לבן", sku: "22", unit: "unit", price: 0.95, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_5", name: "ביס שחור", sku: "22", unit: "unit", price: 1.05, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_6", name: "קוקטייל לבן", sku: "22", unit: "unit", price: 0.95, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_7", name: "קוקטייל שחור", sku: "22", unit: "unit", price: 1.05, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_8", name: "קוקטייל מתוק", sku: "22", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_9", name: "ציפור", sku: "7", unit: "unit", price: 1.0, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_10", name: "ציפור שומשום", sku: "22", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_11", name: "ציפור קמח מלא", sku: "1015", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_12", name: "ציפור מתוק", sku: "22", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_13", name: "חלה שניצל", sku: "1142", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_14", name: "שמינייה", sku: "33", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_15", name: "שמינייה מתוקה", sku: "40", unit: "unit", price: 1.35, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_16", name: "שמינייה שומשום", sku: "33", unit: "unit", price: 1.3, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_17", name: "שמינייה חצי מתוק", sku: "33", unit: "unit", price: 1.25, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_18", name: "שמינייה מתוק 90 גרם", sku: "33", unit: "unit", price: 1.5, minQty: 1, step: 1, quickAdd: 25, available: true, weightGrams: 90 },
      { id: "c2_19", name: "מקל שומשום", sku: "1168", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_20", name: "כדורי קמח מלא", sku: "1156", unit: "unit", price: 1.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c3",
    name: "בייגלים",
    products: [
      { id: "c3_1", name: "בייגל טוסט", sku: "11", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_2", name: "בייגל אמריקאי", sku: "91", unit: "unit", price: 3.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_3", name: "בייגל פרצל", sku: "1071", unit: "unit", price: 4.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_4", name: "בייגל טעמים", sku: "1160", unit: "unit", price: 4.5, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_5", name: "בייגל שומשום", sku: "91", unit: "unit", price: 3.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_6", name: "בייגל מיני", sku: "91", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_7", name: "בייגלה טוסט", sku: "34", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_8", name: "בייגלה ערבי", sku: "1056", unit: "unit", price: 3.4, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_9", name: "בייגלה ערבי קטן", sku: "1056", unit: "unit", price: 2.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c4",
    name: "פיתות, פרנות ופוקצ׳ות",
    products: [
      { id: "c4_1", name: "פיתה", sku: "10", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_2", name: "פיתה טוסט", sku: "34", unit: "unit", price: 1.6, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_3", name: "פיתה מיני", sku: "116", unit: "unit", price: 0.85, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c4_4", name: "פיתה מיני טעמים", sku: "117", unit: "unit", price: 1.0, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c4_5", name: "פרנה", sku: "9", unit: "unit", price: 3.9, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_6", name: "פרנה 300 גרם", sku: "9", unit: "unit", price: 5.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_7", name: "פרנה מיני", sku: "1161", unit: "unit", price: 2.1, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_8", name: "אצבע פרנה", sku: "1173", unit: "unit", price: 1.6, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_9", name: "אצבע פרנה 60 גרם", sku: "1173", unit: "unit", price: 1.25, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_10", name: "סנדוויץ׳ פרנה", sku: "102", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_11", name: "ג׳בטה", sku: "12", unit: "unit", price: 4.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_12", name: "ג׳בטינה", sku: "76", unit: "unit", price: 3.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c5",
    name: "חלות ומוצרי שישי",
    products: [
      { id: "c5_1", name: "חלה רגילה", sku: "2", unit: "unit", price: 8.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_2", name: "חלה בגט", sku: "2", unit: "unit", price: 9.5, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c5_3", name: "חלה מתוקה", sku: "26", unit: "unit", price: 10.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_4", name: "חלה מיני", sku: "4", unit: "unit", price: 5.2, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_5", name: "חלה מיני פרג", sku: "4", unit: "unit", price: 5.6, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_6", name: "חלה כוסמין", sku: "1109", unit: "unit", price: 13.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_7", name: "חלה קמח מלא", sku: "43", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_8", name: "חלה עגולה", sku: "2", unit: "unit", price: 9.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_9", name: "חלה פרג", sku: "2", unit: "unit", price: 9.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_10", name: "חלה גמדים", sku: "1052", unit: "unit", price: 4.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c5_11", name: "לחם בריוש", sku: "1094", unit: "unit", price: 14.9, minQty: 1, step: 1, quickAdd: 5, available: true },
    ],
  },
  {
    id: "c6",
    name: "מאפים מתוקים",
    products: [
      { id: "c6_1", name: "מאפה שוקולד", sku: "1200", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_2", name: "מאפה קינמון", sku: "1201", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_3", name: "רוגלך", sku: "1202", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_4", name: "רוגלך מיני", sku: "1203", unit: "kg", price: 40.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_5", name: "גביניות", sku: "1204", unit: "kg", price: 39.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_6", name: "תפוחיות", sku: "1205", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_7", name: "מאפה פרג", sku: "1206", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_8", name: "בריוש מתוק", sku: "1172", unit: "kg", price: 42.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_9", name: "בריוש קמח מלא", sku: "1171", unit: "kg", price: 44.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_10", name: "שבלול מתוק", sku: "22", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_11", name: "ביס שוקולד", sku: "1159", unit: "kg", price: 40.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_12", name: "ריק", sku: "1207", unit: "kg", price: 34.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
    ],
  },
  {
    id: "c7",
    name: "מאפים מלוחים",
    products: [
      { id: "c7_1", name: "בורקס גבינה", sku: "1208", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_2", name: "בורקס פיצה", sku: "1209", unit: "kg", price: 35.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_3", name: "בורקס פטריות", sku: "1210", unit: "kg", price: 35.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_4", name: "בורקס תפוח אדמה", sku: "1211", unit: "kg", price: 33.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_5", name: "פילס גבינה", sku: "1212", unit: "kg", price: 39.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_6", name: "תרד גבינה", sku: "1213", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_7", name: "מאפה ספרדי", sku: "1214", unit: "kg", price: 37.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
    ],
  },
];

/**
 * הקטלוג הפעיל נשמר ב-store וניתן לעריכה מצד הניהול.
 * כאן מוחזק עותק ריצה כדי ש-findProduct יחזיר תמיד את הנתונים המעודכנים.
 */
let runtimeCategories: Category[] = CATEGORIES;
let productIndex = new Map(CATEGORIES.flatMap((c) => c.products).map((p) => [p.id, p]));

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

export const BUSINESS = {
  name: "מלון יהודה",
  businessId: "514872365",
  contactName: "רונית לוי",
  phone: "052-4471290",
  email: "orders@hotel-yehuda.co.il",
  address: "דרך חברון 122, ירושלים",
  deliveryNotes: "כניסת ספקים מהחניון האחורי, לקומה -1.",
};

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
