import type { RoundId } from "./catalog";
import type { Order } from "./seed";

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
      c1_2: 5.5,
      c1_9: 13.9,
      c1_12: 8.5,
      c2_1: 1.1,
      c2_2: 1.45,
      c3_2: 3.2,
      c4_1: 0.95,
      c5_1: 7.9,
      c6_3: 33.0,
      c7_1: 31.5,
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
      { productId: "c1_2", qty: 12 },
      { productId: "c2_1", qty: 60 },
      { productId: "c5_1", qty: 18 },
    ],
  },
  {
    customerId: "cust-3",
    round: "morning",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: "c2_1", qty: 90 },
      { productId: "c4_1", qty: 40 },
      { productId: "c3_1", qty: 20 },
    ],
  },
  {
    customerId: "cust-4",
    round: "morning",
    weekdays: [0, 2, 4],
    lines: [
      { productId: "c1_8", qty: 20 },
      { productId: "c1_14", qty: 15 },
      { productId: "c3_1", qty: 30 },
      { productId: "c4_5", qty: 12 },
    ],
  },
  {
    customerId: "cust-5",
    round: "noon",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: "c1_1", qty: 40 },
      { productId: "c2_2", qty: 48 },
      { productId: "c4_11", qty: 16 },
    ],
  },
  {
    customerId: "cust-7",
    round: "noon",
    weekdays: [1, 3, 5],
    lines: [
      { productId: "c6_1", qty: 6 },
      { productId: "c5_1", qty: 25 },
      { productId: "c2_1", qty: 50 },
    ],
  },
  {
    customerId: "cust-8",
    round: "noon",
    weekdays: [0, 2, 4],
    lines: [
      { productId: "c1_12", qty: 18 },
      { productId: "c1_11", qty: 10 },
      { productId: "c2_13", qty: 24 },
    ],
  },
  {
    customerId: SELF_CUSTOMER_ID,
    round: "morning",
    weekdays: [0, 1, 2, 3, 4],
    lines: [
      { productId: "c1_9", qty: 8 },
      { productId: "c2_4", qty: 60 },
      { productId: "c4_1", qty: 50 },
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

