import type { RoundId } from "./catalog";

/**
 * Stage 2 moved the catalog to Supabase (`supabase/seed.sql`'s small dev-only test
 * catalog, 4 products) — this demo order data predates that and referenced a much
 * richer mock catalog (deleted with `data/catalog.ts`'s `CATEGORIES`). Remapped onto
 * the real dev-seed product ids so `findProduct` still resolves every line; reduced
 * product variety here is fine since this is local seed/demo data only (real catalog
 * entry is WORK_PLAN stage 7).
 */
const SEED_BREAD = "90000000-0000-0000-0000-000000000001";
const SEED_BAGUETTE = "90000000-0000-0000-0000-000000000002";
const SEED_CROISSANT = "90000000-0000-0000-0000-000000000003";
const SEED_CHOCOLATE_CAKE = "90000000-0000-0000-0000-000000000004"; // kg

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
      { productId: SEED_BREAD, qty: 15 },
      { productId: SEED_BAGUETTE, qty: 40 },
      { productId: SEED_CROISSANT, qty: 20 },
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
      { productId: SEED_BREAD, qty: 18 },
      { productId: SEED_CHOCOLATE_CAKE, qty: 2 },
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
      { productId: SEED_CHOCOLATE_CAKE, qty: 5 },
      { productId: SEED_BREAD, qty: 12 },
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
      { productId: SEED_BAGUETTE, qty: 35 },
      { productId: SEED_CROISSANT, qty: 25 },
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
      { productId: SEED_BREAD, qty: 12 },
      { productId: SEED_CHOCOLATE_CAKE, qty: 2 },
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
      { productId: SEED_BREAD, qty: 24 },
      { productId: SEED_BAGUETTE, qty: 45 },
    ],
  },
];

export const SEED_RECURRING: RecurringOrder[] = [];
