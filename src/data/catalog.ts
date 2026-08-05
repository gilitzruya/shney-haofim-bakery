export type Unit = "unit" | "kg";

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  price: number;
  available: boolean;
  unavailableReason?: string;
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
    name: "לחמים, בגטים וג'בטות",
    products: [
      { id: "p1_1", name: "לחם מחמצת", unit: "unit", price: 15.9, available: true },
      { id: "p1_2", name: "בגט מחמצת", unit: "unit", price: 8.9, available: true },
      { id: "p1_3", name: "כפרי ארוך", unit: "unit", price: 14.9, available: true },
      { id: "p1_4", name: "לחם מלא עם זרעים", unit: "unit", price: 16.9, available: true },
      {
        id: "p1_5",
        name: "לחם ללא גלוטן",
        unit: "unit",
        price: 18.9,
        available: false,
        unavailableReason: "לא זמין למועד שנבחר",
      },
    ],
  },
  {
    id: "c2",
    name: "לחמניות",
    products: [
      { id: "p2_1", name: "ציפור שומשום", unit: "unit", price: 1.1, available: true },
      { id: "p2_2", name: "לחמניית המבורגר", unit: "unit", price: 1.7, available: true },
      { id: "p2_3", name: "קוקטייל מתוק", unit: "unit", price: 1.1, available: true },
    ],
  },
  {
    id: "c3",
    name: "בייגלים",
    products: [
      { id: "p3_1", name: "בייגל ניו יורק", unit: "unit", price: 4.5, available: true },
      { id: "p3_2", name: "בייגל שומשום", unit: "unit", price: 4.2, available: true },
      { id: "p3_3", name: "מיני בייגלים לקוקטייל", unit: "kg", price: 32.0, available: true },
    ],
  },
  {
    id: "c4",
    name: "פיתות, פרנות ופוקצ'ות",
    products: [
      { id: "p4_1", name: "פיתה עיראקית", unit: "unit", price: 3.2, available: true },
      { id: "p4_2", name: "פוקאצ'ה זעתר", unit: "unit", price: 12.9, available: true },
      { id: "p4_3", name: "פרנה איטלקית", unit: "unit", price: 13.5, available: true },
    ],
  },
  {
    id: "c5",
    name: "חלות ומוצרי שישי",
    products: [
      { id: "p5_1", name: "חלה קלועה קטנה", unit: "unit", price: 11.9, available: true },
      { id: "p5_2", name: "חלה קלועה גדולה", unit: "unit", price: 16.9, available: true },
      { id: "p5_3", name: "חלת שוקולד", unit: "unit", price: 18.9, available: true },
    ],
  },
  {
    id: "c6",
    name: "מאפים מתוקים",
    products: [
      { id: "p6_1", name: "קרואסון חמאה", unit: "unit", price: 6.9, available: true },
      { id: "p6_2", name: "רוגלך שוקולד", unit: "unit", price: 5.5, available: true },
      { id: "p6_3", name: "בורקס תפוחים", unit: "unit", price: 7.2, available: true },
    ],
  },
  {
    id: "c7",
    name: "מאפים מלוחים",
    products: [
      { id: "p7_1", name: "בורקס גבינה", unit: "kg", price: 36.0, available: true },
      { id: "p7_2", name: "בורקס תפוח אדמה", unit: "kg", price: 32.0, available: true },
      { id: "p7_3", name: "בורקס פטריות", unit: "unit", price: 7.5, available: true },
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
  phone: "03-6541234",
  whatsapp: "054-8123900",
  email: "service@2bakers.co.il",
  address: "האומן 14, אזור התעשייה, ראשון לציון",
  hours: [
    { day: "ראשון – חמישי", time: "05:00 – 17:00" },
    { day: "שישי וערבי חג", time: "05:00 – 13:00" },
    { day: "שבת", time: "סגור" },
  ],
};
