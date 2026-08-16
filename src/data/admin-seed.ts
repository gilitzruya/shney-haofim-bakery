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

interface SeedSpec {
  customerId: string;
  round: RoundId;
  lines: { productId: string; qty: number }[];
  status?: Order["status"];
  /** 0 = מחר, 1 = מחרתיים */
  dayOffset?: number;
}

const SPECS: SeedSpec[] = [
  {
    customerId: "cust-2",
    round: "morning",
    lines: [
      { productId: "c1_2", qty: 12 },
      { productId: "c2_1", qty: 60 },
      { productId: "c5_1", qty: 18 },
    ],
  },
  {
    customerId: "cust-3",
    round: "morning",
    lines: [
      { productId: "c2_1", qty: 90 },
      { productId: "c4_1", qty: 40 },
    ],
  },
  {
    customerId: "cust-4",
    round: "morning",
    lines: [
      { productId: "c1_8", qty: 20 },
      { productId: "c1_14", qty: 15 },
      { productId: "c3_1", qty: 30 },
    ],
  },
  {
    customerId: "cust-5",
    round: "noon",
    lines: [
      { productId: "c1_1", qty: 40 },
      { productId: "c2_2", qty: 48 },
    ],
  },
  {
    customerId: "cust-7",
    round: "noon",
    lines: [
      { productId: "c6_1", qty: 6 },
      { productId: "c5_1", qty: 25 },
      { productId: "c2_1", qty: 50 },
    ],
  },
  {
    customerId: "cust-8",
    round: "noon",
    lines: [
      { productId: "c1_12", qty: 18 },
      { productId: "c1_11", qty: 10 },
    ],
    dayOffset: 1,
  },
  {
    customerId: "cust-2",
    round: "morning",
    lines: [
      { productId: "c2_1", qty: 55 },
      { productId: "c5_2", qty: 12 },
    ],
    dayOffset: 1,
  },
];

/** הזמנות דמו של שאר הלקוחות, נבנות ביחס לתאריך "מחר". */
export function buildAdminOrders(dateForOffset: (offset: number) => string): Order[] {
  return SPECS.map((spec, i) => ({
    id: `ao-${i + 1}`,
    customerId: spec.customerId,
    date: dateForOffset(spec.dayOffset ?? 0),
    round: spec.round,
    status: spec.status ?? "approved",
    lines: spec.lines,
    createdFrom: "manual" as const,
  }));
}
