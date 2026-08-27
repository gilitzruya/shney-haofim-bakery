import type { RoundId } from "./catalog";
import type { Order } from "./seed";

/**
 * Stage 2 moved the catalog to Supabase (`supabase/seed.sql`'s small dev-only test
 * catalog, 4 products) — this demo customer/order data predates that and referenced
 * a much richer mock catalog (deleted with `data/catalog.ts`'s `CATEGORIES`).
 * Remapped onto the real dev-seed product ids so `findProduct` resolves every line;
 * reduced product variety is fine since this is local seed/demo data only (real
 * catalog entry is WORK_PLAN stage 7).
 */
const SEED_BREAD = "90000000-0000-0000-0000-000000000001";
const SEED_BAGUETTE = "90000000-0000-0000-0000-000000000002";
const SEED_CROISSANT = "90000000-0000-0000-0000-000000000003";
const SEED_CHOCOLATE_CAKE = "90000000-0000-0000-0000-000000000004"; // kg

export interface CustomerContact {
  name: string;
  phone: string;
  email: string;
}

export interface Customer {
  id: string;
  /** קוד לקוח לזיהוי במערכת החשבונות / חשבונית */
  code?: string | undefined;
  /** שם העסק / הלקוח */
  name: string;
  address: string;
  contacts: CustomerContact[];
  /** הסבבים שהלקוח רשאי להזמין בהם */
  allowedRounds: RoundId[];
  /** לקוח חסום אינו יכול לבצע הזמנות חדשות */
  blocked?: boolean | undefined;
  /** מחירים מיוחדים ללקוח (productId → מחיר) — ימומש בשלב מאוחר יותר */
  priceOverrides?: Record<string, number> | undefined;
}

/** מזהה הלקוח שמייצג את העסק המחובר בצד הלקוח בדמו. */
export const SELF_CUSTOMER_ID = "cust-self";

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: SELF_CUSTOMER_ID,
    code: "1000",
    name: "מלון יהודה",
    address: "דרך חברון 122, ירושלים",
    contacts: [{ name: "רונית לוי", phone: "052-4471290", email: "orders@hotel-yehuda.co.il" }],
    allowedRounds: ["morning", "noon"],
  },
  {
    id: "cust-2",
    code: "1001",
    name: "בית קפה אלמה",
    address: "עמק רפאים 34, ירושלים",
    contacts: [{ name: "אלמה כהן", phone: "054-2213388", email: "alma@cafe-alma.co.il" }],
    allowedRounds: ["morning"],
    priceOverrides: {
      [SEED_BREAD]: 8.5,
      [SEED_BAGUETTE]: 6.5,
      [SEED_CROISSANT]: 5.0,
      [SEED_CHOCOLATE_CAKE]: 55.0,
    },
  },
  {
    id: "cust-3",
    code: "1002",
    name: "גן הילדים שקד",
    address: "הפסגה 12, ירושלים",
    contacts: [{ name: "שירה בן דוד", phone: "050-7719042", email: "shaked.gan@gmail.com" }],
    allowedRounds: ["morning"],
  },
  {
    id: "cust-4",
    code: "1003",
    name: "דלי מרקט",
    address: "יפו 88, ירושלים",
    contacts: [{ name: "מאיר אזולאי", phone: "053-8820114", email: "meir@delimarket.co.il" }],
    allowedRounds: ["morning", "noon"],
  },
  {
    id: "cust-5",
    code: "1004",
    name: "המסעדה של יוסי",
    address: "המלך ג׳ורג׳ 21, ירושלים",
    contacts: [{ name: "יוסי מזרחי", phone: "052-9004471", email: "yossi@rest-yossi.co.il" }],
    allowedRounds: ["morning", "noon"],
  },
  {
    id: "cust-6",
    code: "1005",
    name: "מכולת השכונה",
    address: "בית הכרם 5, ירושלים",
    contacts: [{ name: "נעם פרץ", phone: "054-6612903", email: "noam@shchuna.co.il" }],
    allowedRounds: ["morning"],
    blocked: true,
  },
  {
    id: "cust-7",
    code: "1006",
    name: "קייטרינג רימון",
    address: "פייר קניג 30, ירושלים",
    contacts: [{ name: "תמר שגב", phone: "058-4412207", email: "tamar@rimon-catering.co.il" }],
    allowedRounds: ["morning", "noon"],
  },
  {
    id: "cust-8",
    code: "1007",
    name: "פיצריה סן מרקו",
    address: "אגריפס 44, ירושלים",
    contacts: [{ name: "דוד ביטון", phone: "050-3320988", email: "sanmarco@walla.com" }],
    allowedRounds: ["noon"],
  },
];

interface CustomerPlan {
  customerId: string;
  round: RoundId;
  /** ימי השבוע שבהם הלקוח מקבל אספקה (0 = ראשון … 6 = שבת) */
  weekdays: number[];
  /** תבנית הזמנה בסיסית — הכמויות משתנות מעט מיום ליום */
  lines: { productId: string; qty: number }[];
}

/** תוכניות אספקה קבועות ללקוחות הדמו — מייצרות הזמנות לשבועיים קדימה. */
const PLANS: CustomerPlan[] = [
  {
    customerId: "cust-2",
    round: "morning",
    weekdays: [0, 1, 2, 3, 4, 5],
    lines: [
      { productId: SEED_BAGUETTE, qty: 72 },
      { productId: SEED_BREAD, qty: 18 },
    ],
  },
  {
    customerId: "cust-3",
    round: "morning",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: SEED_BAGUETTE, qty: 90 },
      { productId: SEED_CROISSANT, qty: 60 },
    ],
  },
  {
    customerId: "cust-4",
    round: "morning",
    weekdays: [0, 2, 4],
    lines: [
      { productId: SEED_BREAD, qty: 35 },
      { productId: SEED_CROISSANT, qty: 30 },
      { productId: SEED_BAGUETTE, qty: 12 },
    ],
  },
  {
    customerId: "cust-5",
    round: "noon",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: SEED_BAGUETTE, qty: 56 },
      { productId: SEED_CROISSANT, qty: 48 },
    ],
  },
  {
    customerId: "cust-7",
    round: "noon",
    weekdays: [1, 3, 5],
    lines: [
      { productId: SEED_CHOCOLATE_CAKE, qty: 6 },
      { productId: SEED_BREAD, qty: 25 },
      { productId: SEED_BAGUETTE, qty: 50 },
    ],
  },
  {
    customerId: "cust-8",
    round: "noon",
    weekdays: [0, 2, 4],
    lines: [
      { productId: SEED_CROISSANT, qty: 18 },
      { productId: SEED_BREAD, qty: 34 },
    ],
  },
  {
    customerId: SELF_CUSTOMER_ID,
    round: "morning",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: SEED_BREAD, qty: 8 },
      { productId: SEED_CROISSANT, qty: 110 },
    ],
  },
];

/** וריאציה יציבה (ללא רנדום) כדי שההידרציה והדוחות יישארו עקביים. */
function variation(seed: string, base: number): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const delta = Math.round(base * 0.2 * (((hash % 7) - 3) / 3));
  return Math.max(1, base + delta);
}

/** מספר ההזמנות בדמו — כמות קטנה שנוחה לבדיקה. */
const DEMO_ORDERS_COUNT = 6;

/**
 * הזמנות דמו ליום האספקה הקרוב בלבד (offset 0 = מחר) — שש הזמנות סה״כ.
 */
export function buildAdminOrders(dateForOffset: (offset: number) => string): Order[] {
  const date = dateForOffset(0);
  return PLANS.slice(0, DEMO_ORDERS_COUNT).map((plan) => {
    const id = `ao-${date}-${plan.customerId}-${plan.round}`;
    return {
      id,
      customerId: plan.customerId,
      date,
      round: plan.round,
      status: "approved" as const,
      lines: plan.lines.map((l) => ({
        productId: l.productId,
        qty: variation(`${id}-${l.productId}`, l.qty),
      })),
      createdFrom: "manual" as const,
    };
  });
}

