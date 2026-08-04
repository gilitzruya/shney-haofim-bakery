import { CATEGORIES } from "./catalog";
import type { RoundId } from "./catalog";

export type OrderStatus = "draft" | "approved" | "needs_update" | "reopened" | "completed" | "cancelled";

export interface OrderLine {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  /** ISO date of the delivery day */
  date: string;
  round: RoundId;
  status: OrderStatus;
  lines: OrderLine[];
  /** locked for changes (past cutoff) */
  closed?: boolean | undefined;
  note?: string | undefined;
  createdFrom?: "manual" | "recurring" | undefined;
  cutoffText?: string | undefined;
}

export type RecurringStatus = "active" | "paused" | "cancelled";

export interface RecurringOrder {
  id: string;
  name: string;
  /** 0 = Sunday … 5 = Friday */
  weekdays: number[];
  round: RoundId;
  status: RecurringStatus;
  lines: OrderLine[];
  note?: string | undefined;
  needsAttention?: boolean | undefined;
  attentionText?: string | undefined;
}

const lines = (pairs: Array<[string, number]>): OrderLine[] =>
  pairs.map(([productId, qty]) => ({ productId, qty }));

export const SEED_ORDERS: Order[] = [
  {
    id: "o-1001",
    date: "2026-08-04",
    round: "morning",
    status: "approved",
    lines: lines([
      ["p1_1", 6],
      ["p1_2", 10],
      ["p2_1", 24],
      ["p6_1", 12],
      ["p7_1", 2.5],
    ]),
    cutoffText: "ניתן לעדכן עד היום בשעה 14:00",
    createdFrom: "manual",
  },
  {
    id: "o-1002",
    date: "2026-08-10",
    round: "evening",
    status: "draft",
    lines: lines([
      ["p1_3", 4],
      ["p3_1", 12],
      ["p5_1", 3],
    ]),
    cutoffText: "ניתן לערוך ולאשר עד יום חמישי בשעה 14:00",
    createdFrom: "manual",
  },
  {
    id: "o-1003",
    date: "2026-08-12",
    round: "morning",
    status: "reopened",
    lines: lines([
      ["p1_1", 3],
      ["p4_1", 30],
    ]),
    cutoffText: "ניתן לעדכן עד יום שני בשעה 14:00",
    createdFrom: "recurring",
  },
  {
    id: "o-0912",
    date: "2026-07-28",
    round: "morning",
    status: "completed",
    lines: lines([
      ["p1_1", 8],
      ["p2_2", 40],
      ["p7_2", 3],
    ]),
    closed: true,
  },
  {
    id: "o-0911",
    date: "2026-07-21",
    round: "noon",
    status: "completed",
    lines: lines([
      ["p5_2", 6],
      ["p6_2", 20],
    ]),
    closed: true,
  },
  {
    id: "o-0905",
    date: "2026-07-14",
    round: "evening",
    status: "cancelled",
    lines: lines([
      ["p1_4", 5],
      ["p3_2", 10],
    ]),
    closed: true,
  },
];

export const SEED_RECURRING: RecurringOrder[] = [
  {
    id: "r-01",
    name: "אספקת בוקר – חדר אוכל",
    weekdays: [0, 1, 2, 3, 4],
    round: "morning",
    status: "active",
    lines: lines([
      ["p1_1", 6],
      ["p2_1", 40],
      ["p6_1", 15],
      ["p7_1", 2.5],
    ]),
    note: "לפרוס את הלחמים.",
  },
  {
    id: "r-02",
    name: "מאפים לבית קפה",
    weekdays: [0, 2, 4],
    round: "noon",
    status: "active",
    lines: lines([
      ["p6_1", 24],
      ["p6_2", 30],
      ["p3_1", 12],
    ]),
    needsAttention: true,
    attentionText: "מוצר אחד בהזמנה אינו זמין יותר – יש לעדכן את רשימת המוצרים",
  },
  {
    id: "r-03",
    name: "חלות לשישי",
    weekdays: [5],
    round: "morning",
    status: "paused",
    lines: lines([
      ["p5_1", 10],
      ["p5_2", 10],
      ["p5_3", 4],
    ]),
  },
  {
    id: "r-04",
    name: "אירועים – סוף שבוע",
    weekdays: [3, 4],
    round: "evening",
    status: "cancelled",
    lines: lines([
      ["p4_2", 12],
      ["p7_3", 20],
    ]),
  },
];

/** Product ids that exist in the catalog, used to flag stale recurring lines. */
export const CATALOG_PRODUCT_IDS = new Set(CATEGORIES.flatMap((c) => c.products.map((p) => p.id)));
