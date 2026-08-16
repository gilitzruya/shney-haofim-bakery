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
  /** מזהה הלקוח שההזמנה שייכת לו (ריק = העסק המחובר בצד הלקוח) */
  customerId?: string | undefined;
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


export const SEED_ORDERS: Order[] = [
  {
    id: "o-past-1",
    date: "2026-08-10",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "manual",
    lines: [
      { productId: "c1_1", qty: 15 },
      { productId: "c2_1", qty: 40 },
      { productId: "c4_1", qty: 20 },
    ],
  },
  {
    id: "o-past-2",
    date: "2026-08-09",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "manual",
    lines: [
      { productId: "c1_1", qty: 10 },
      { productId: "c5_1", qty: 8 },
      { productId: "c7_1", qty: 2 },
    ],
  },
  {
    id: "o-past-3",
    date: "2026-08-07",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "recurring",
    lines: [
      { productId: "c6_1", qty: 3 },
      { productId: "c6_2", qty: 2 },
      { productId: "c5_1", qty: 12 },
    ],
  },
  {
    id: "o-past-4",
    date: "2026-08-06",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "manual",
    lines: [
      { productId: "c2_1", qty: 35 },
      { productId: "c4_1", qty: 25 },
    ],
  },
  {
    id: "o-past-5",
    date: "2026-08-05",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "manual",
    lines: [
      { productId: "c1_1", qty: 12 },
      { productId: "c7_3", qty: 2 },
    ],
  },
  {
    id: "o-past-6",
    date: "2026-08-04",
    round: "morning",
    status: "completed",
    closed: true,
    createdFrom: "manual",
    lines: [
      { productId: "c1_1", qty: 18 },
      { productId: "c2_1", qty: 45 },
      { productId: "c5_1", qty: 6 },
    ],
  },
];

export const SEED_RECURRING: RecurringOrder[] = [];

/** Product ids that exist in the catalog, used to flag stale recurring lines. */
export const CATALOG_PRODUCT_IDS = new Set(CATEGORIES.flatMap((c) => c.products.map((p) => p.id)));
