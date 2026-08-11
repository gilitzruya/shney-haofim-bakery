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
      { id: "c1_1", name: "חצי בגט", unit: "unit", price: 3.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_2", name: "בגט ארוך", unit: "unit", price: 6.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_3", name: "בגט מחמצת", unit: "unit", price: 8.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_4", name: "בגטיה", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_5", name: "בגטינה", unit: "unit", price: 2.8, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_6", name: "כפרי קצר", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_7", name: "כפרי ארוך", unit: "unit", price: 14.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_8", name: "לחם הבית", unit: "unit", price: 12.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_9", name: "לחם מחמצת", unit: "unit", price: 15.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_10", name: "לחם ללא גלוטן", unit: "unit", price: 18.9, minQty: 1, step: 1, quickAdd: 2, available: true },
      { id: "c1_11", name: "אש תנור", unit: "unit", price: 14.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_12", name: "פוקצ׳ה", unit: "unit", price: 9.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_13", name: "לחם מלא פשוט", unit: "unit", price: 12.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_14", name: "לחם שחור פרוס", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c1_15", name: "שומשום קצר", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c1_16", name: "שומשום ארוך", unit: "unit", price: 5.9, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c1_17", name: "קסטן", unit: "unit", price: 13.5, minQty: 1, step: 1, quickAdd: 5, available: true },
    ],
  },
  {
    id: "c2",
    name: "לחמניות וכריכים",
    products: [
      { id: "c2_1", name: "לחמניית שומשום", unit: "unit", price: 1.4, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_2", name: "לחמניית המבורגר", unit: "unit", price: 1.7, minQty: 1, step: 1, quickAdd: 16, available: true },
      { id: "c2_3", name: "מיני המבורגר", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_4", name: "ביס לבן", unit: "unit", price: 0.95, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_5", name: "ביס שחור", unit: "unit", price: 1.05, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_6", name: "קוקטייל לבן", unit: "unit", price: 0.95, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_7", name: "קוקטייל שחור", unit: "unit", price: 1.05, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_8", name: "קוקטייל מתוק", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_9", name: "ציפור", unit: "unit", price: 1.0, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_10", name: "ציפור שומשום", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_11", name: "ציפור קמח מלא", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_12", name: "ציפור מתוק", unit: "unit", price: 1.1, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_13", name: "חלה שניצל", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_14", name: "שמינייה", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_15", name: "שמינייה מתוקה", unit: "unit", price: 1.35, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_16", name: "שמינייה שומשום", unit: "unit", price: 1.3, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_17", name: "שמינייה חצי מתוק", unit: "unit", price: 1.25, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_18", name: "שמינייה מתוק 90 גרם", unit: "unit", price: 1.5, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c2_19", name: "מקל שומשום", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c2_20", name: "כדורי קמח מלא", unit: "unit", price: 1.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c3",
    name: "בייגלים",
    products: [
      { id: "c3_1", name: "בייגל טוסט", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_2", name: "בייגל אמריקאי", unit: "unit", price: 3.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_3", name: "בייגל פרצל", unit: "unit", price: 4.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_4", name: "בייגל טעמים", unit: "unit", price: 4.5, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_5", name: "בייגל שומשום", unit: "unit", price: 3.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_6", name: "בייגל מיני", unit: "unit", price: 2.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_7", name: "בייגלה טוסט", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_8", name: "בייגלה ערבי", unit: "unit", price: 3.4, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c3_9", name: "בייגלה ערבי קטן", unit: "unit", price: 2.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c4",
    name: "פיתות, פרנות ופוקצ׳ות",
    products: [
      { id: "c4_1", name: "פיתה", unit: "unit", price: 1.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_2", name: "פיתה טוסט", unit: "unit", price: 1.6, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_3", name: "פיתה מיני", unit: "unit", price: 0.85, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c4_4", name: "פיתה מיני טעמים", unit: "unit", price: 1.0, minQty: 1, step: 1, quickAdd: 25, available: true },
      { id: "c4_5", name: "פרנה", unit: "unit", price: 3.9, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_6", name: "פרנה 300 גרם", unit: "unit", price: 5.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_7", name: "פרנה מיני", unit: "unit", price: 2.1, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_8", name: "אצבע פרנה", unit: "unit", price: 1.6, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_9", name: "אצבע פרנה 60 גרם", unit: "unit", price: 1.25, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_10", name: "סנדוויץ׳ פרנה", unit: "unit", price: 3.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_11", name: "ג׳בטה", unit: "unit", price: 4.8, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c4_12", name: "ג׳בטינה", unit: "unit", price: 3.4, minQty: 1, step: 1, quickAdd: 10, available: true },
    ],
  },
  {
    id: "c5",
    name: "חלות ומוצרי שישי",
    products: [
      { id: "c5_1", name: "חלה רגילה", unit: "unit", price: 8.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_2", name: "חלה בגט", unit: "unit", price: 9.5, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c5_3", name: "חלה מתוקה", unit: "unit", price: 10.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_4", name: "חלה מיני", unit: "unit", price: 5.2, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_5", name: "חלה מיני פרג", unit: "unit", price: 5.6, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_6", name: "חלה כוסמין", unit: "unit", price: 13.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_7", name: "חלה קמח מלא", unit: "unit", price: 11.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_8", name: "חלה עגולה", unit: "unit", price: 9.5, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_9", name: "חלה פרג", unit: "unit", price: 9.9, minQty: 1, step: 1, quickAdd: 5, available: true },
      { id: "c5_10", name: "חלה גמדים", unit: "unit", price: 4.2, minQty: 1, step: 1, quickAdd: 10, available: true },
      { id: "c5_11", name: "לחם בריוש", unit: "unit", price: 14.9, minQty: 1, step: 1, quickAdd: 5, available: true },
    ],
  },
  {
    id: "c6",
    name: "מאפים מתוקים",
    products: [
      { id: "c6_1", name: "מאפה שוקולד", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_2", name: "מאפה קינמון", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_3", name: "רוגלך", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_4", name: "רוגלך מיני", unit: "kg", price: 40.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_5", name: "גביניות", unit: "kg", price: 39.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_6", name: "תפוחיות", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_7", name: "מאפה פרג", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_8", name: "בריוש מתוק", unit: "kg", price: 42.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_9", name: "בריוש קמח מלא", unit: "kg", price: 44.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_10", name: "שבלול מתוק", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_11", name: "ביס שוקולד", unit: "kg", price: 40.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c6_12", name: "ריק", unit: "kg", price: 34.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
    ],
  },
  {
    id: "c7",
    name: "מאפים מלוחים",
    products: [
      { id: "c7_1", name: "בורקס גבינה", unit: "kg", price: 36.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_2", name: "בורקס פיצה", unit: "kg", price: 35.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_3", name: "בורקס פטריות", unit: "kg", price: 35.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_4", name: "בורקס תפוח אדמה", unit: "kg", price: 33.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_5", name: "פילס גבינה", unit: "kg", price: 39.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_6", name: "תרד גבינה", unit: "kg", price: 38.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
      { id: "c7_7", name: "מאפה ספרדי", unit: "kg", price: 37.0, minQty: 0.5, step: 0.5, quickAdd: 1, available: true },
    ],
  },
];

export const ALL_PRODUCTS: Product[] = CATEGORIES.flatMap((c) => c.products);

export function findProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
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
