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
  /** ISO date of the first delivery of this recurring order */
  startDate?: string | undefined;
  note?: string | undefined;
  needsAttention?: boolean | undefined;
  attentionText?: string | undefined;
}

const CUTOFF_TEXT = "ניתן לעדכן עד יום לפני האספקה בשעה 14:00";

export const SEED_ORDERS: Order[] = [
  {
    id: "o-demo-1",
    date: "2026-08-09",
    round: "morning",
    status: "approved",
    lines: [
      { productId: "c1_1", qty: 20 },
      { productId: "c2_1", qty: 50 },
      { productId: "c4_1", qty: 30 },
      { productId: "c7_1", qty: 2 },
    ],
    createdFrom: "manual",
    cutoffText: CUTOFF_TEXT,
  },
  {
    id: "o-demo-2",
    date: "2026-08-10",
    round: "noon",
    status: "approved",
    lines: [
      { productId: "c3_1", qty: 20 },
      { productId: "c6_2", qty: 1.5 },
      { productId: "c2_2", qty: 32 },
    ],
    createdFrom: "recurring",
    cutoffText: CUTOFF_TEXT,
  },
  {
    id: "o-demo-3",
    date: "2026-08-11",
    round: "morning",
    status: "draft",
    lines: [
      { productId: "c1_8", qty: 6 },
      { productId: "c5_1", qty: 5 },
    ],
    createdFrom: "manual",
    cutoffText: CUTOFF_TEXT,
  },
  {
    id: "o-demo-4",
    date: "2026-08-12",
    round: "noon",
    status: "needs_update",
    lines: [
      { productId: "c1_10", qty: 4 },
      { productId: "c7_2", qty: 2 },
    ],
    note: "פריט אחד אזל במלאי — נא לעדכן את ההזמנה",
    createdFrom: "manual",
    cutoffText: CUTOFF_TEXT,
  },
  {
    id: "o-demo-5",
    date: "2026-08-04",
    round: "morning",
    status: "completed",
    closed: true,
    lines: [
      { productId: "c1_1", qty: 25 },
      { productId: "c2_1", qty: 50 },
      { productId: "c4_2", qty: 20 },
    ],
    createdFrom: "recurring",
  },
  {
    id: "o-demo-6",
    date: "2026-08-02",
    round: "noon",
    status: "completed",
    closed: true,
    lines: [
      { productId: "c6_1", qty: 2 },
      { productId: "c3_2", qty: 20 },
      { productId: "c5_3", qty: 4 },
    ],
    createdFrom: "manual",
  },
  {
    id: "o-demo-7",
    date: "2026-08-03",
    round: "morning",
    status: "cancelled",
    closed: true,
    lines: [{ productId: "c1_2", qty: 10 }],
    createdFrom: "manual",
  },
];

export const SEED_RECURRING: RecurringOrder[] = [
  {
    id: "r-demo-1",
    name: "אספקת בוקר יומית",
    weekdays: [0, 1, 2, 3, 4],
    round: "morning",
    status: "active",
    startDate: "2026-08-09",
    lines: [
      { productId: "c1_1", qty: 20 },
      { productId: "c2_1", qty: 50 },
      { productId: "c4_1", qty: 30 },
    ],
  },
  {
    id: "r-demo-2",
    name: "מאפים לסופ״ש",
    weekdays: [4, 5],
    round: "noon",
    status: "active",
    startDate: "2026-08-07",
    needsAttention: true,
    attentionText: "מוצר בהזמנה אינו זמין יותר — נא לעדכן",
    lines: [
      { productId: "c6_1", qty: 2 },
      { productId: "c6_2", qty: 1.5 },
      { productId: "c5_1", qty: 6 },
    ],
  },
  {
    id: "r-demo-3",
    name: "בורקסים לאמצע השבוע",
    weekdays: [1, 3],
    round: "noon",
    status: "paused",
    startDate: "2026-08-10",
    lines: [
      { productId: "c7_1", qty: 2 },
      { productId: "c7_3", qty: 1.5 },
    ],
  },
  {
    id: "r-demo-4",
    name: "חלות לשבת",
    weekdays: [4],
    round: "morning",
    status: "cancelled",
    lines: [{ productId: "c5_1", qty: 12 }],
  },
];

/** Product ids that exist in the catalog, used to flag stale recurring lines. */
export const CATALOG_PRODUCT_IDS = new Set(CATEGORIES.flatMap((c) => c.products.map((p) => p.id)));
