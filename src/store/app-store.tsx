import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { applyRuntimeCatalog, BUSINESS, CATEGORIES } from "@/data/catalog";
import type { Category, Product, RoundId } from "@/data/catalog";
import { SEED_ORDERS, SEED_RECURRING } from "@/data/seed";
import type { Order, OrderLine, RecurringOrder } from "@/data/seed";
import { nextOccurrence, roundQty } from "@/lib/format";
import { findProduct } from "@/data/catalog";

import { buildAdminOrders, SEED_CUSTOMERS } from "@/data/admin-seed";
import type { Customer } from "@/data/admin-seed";
import { isoFromToday } from "@/lib/admin/dates";
import { accountingAdapter, type AdminDocument, type DocumentType } from "@/lib/admin/accounting";
import {
  applyRuntimeCutoffExceptions,
  applyRuntimeCutoffRules,
  DEFAULT_CUTOFF_RULES,
  normalizeCutoffRules,
  type CutoffException,
  type CutoffRule,
} from "@/lib/admin/cutoff-rules";

const STORAGE_KEY = "bakery-demo-state:v19";

/** הזמנה קבועה שנוצרה על ידי המאפייה בשם לקוח מסוים. */
export interface AdminRecurringOrder {
  id: string;
  customerId: string;
  name: string;
  /** 0 = ראשון … 5 = שישי */
  weekdays: number[];
  round: RoundId;
  lines: OrderLine[];
  startDate?: string | undefined;
}

export type CartMode = "order" | "recurring_create" | "recurring_edit" | "onetime";

export interface CartDraft {
  mode: CartMode;
  /** order id when editing an existing order / one-time override */
  orderId?: string | undefined;
  /** recurring id when creating or editing a recurring order */
  recurringId?: string | undefined;
  date?: string | undefined;
  round: RoundId;
  /** recurring create/edit form values */
  name?: string | undefined;
  weekdays?: number[] | undefined;
  /** first delivery date for a new recurring order */
  startDate?: string | undefined;
  quantities: Record<string, number>;
}

interface Business {
  name: string;
  businessId: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  deliveryNotes: string;
}

interface PersistedState {
  orders: Order[];
  recurring: RecurringOrder[];
  business: Business;
  draft: CartDraft | null;
  /** admin side: bakery customers */
  customers: Customer[];
  /** admin side: orders placed by the other customers */
  adminOrders: Order[];
  /** admin side: editable catalog (categories order, products) */
  catalog: Category[];
  /** admin side: issued accounting documents */
  documents: AdminDocument[];
  /** admin side: recurring orders created on behalf of customers */
  adminRecurring: AdminRecurringOrder[];
  /** admin side: per-weekday ordering cutoff rules */
  cutoffRules: CutoffRule[];
  /** admin side: one-off exceptions (holidays, closed days, early cutoffs) */
  cutoffExceptions: CutoffException[];
}

const emptyDraft = (mode: CartMode = "order"): CartDraft => ({
  mode,
  round: "morning",
  quantities: {},
});

const seedAdminOrders = () => buildAdminOrders((offset) => isoFromToday(1 + offset));

const initialState: PersistedState = {
  orders: SEED_ORDERS,
  recurring: SEED_RECURRING,
  business: BUSINESS,
  draft: null,
  customers: SEED_CUSTOMERS,
  adminOrders: seedAdminOrders(),
  catalog: CATEGORIES,
  documents: [],
  adminRecurring: [],
  cutoffRules: DEFAULT_CUTOFF_RULES,
  cutoffExceptions: [],
};

/**
 * A one-off order draft with no products selected is meaningless — never keep
 * it in storage, so leaving the app without picking anything leaves no draft.
 */
function stripEmptyDraft(s: PersistedState): PersistedState {
  const d = s.draft;
  if (d && d.mode === "order" && linesFromQuantities(d.quantities).length === 0) {
    return { ...s, draft: null };
  }
  return s;
}

/** Demo admin orders are relative to "tomorrow" — refresh them once they age out. */
function freshAdminOrders(persisted: Order[] | undefined): Order[] {
  if (!persisted || persisted.length === 0) return seedAdminOrders();
  const today = isoFromToday(0);
  const hasFuture = persisted.some((o) => o.date >= today);
  return hasFuture ? persisted : seedAdminOrders();
}

/** Merge persisted customers with seed data so new fields (e.g. code) are backfilled without losing user edits. */
function mergeCustomersWithSeed(persisted: Customer[] | undefined): Customer[] {
  if (!persisted || persisted.length === 0) return SEED_CUSTOMERS;
  const seedById = new Map(SEED_CUSTOMERS.map((c) => [c.id, c]));
  return persisted.map((c) => {
    const seed = seedById.get(c.id);
    if (!seed) return c;
    return { ...c, code: c.code ?? seed.code };
  });
}

function loadState(): PersistedState {

  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return stripEmptyDraft({
      orders: parsed.orders ?? SEED_ORDERS,
      recurring: parsed.recurring ?? SEED_RECURRING,
      business: parsed.business ?? BUSINESS,
      draft: parsed.draft ?? null,
      customers: mergeCustomersWithSeed(parsed.customers),
      adminOrders: freshAdminOrders(parsed.adminOrders),
      catalog: parsed.catalog?.length ? parsed.catalog : CATEGORIES,
      documents: parsed.documents ?? [],
      adminRecurring: parsed.adminRecurring ?? [],
      cutoffRules: normalizeCutoffRules(parsed.cutoffRules),
      cutoffExceptions: parsed.cutoffExceptions ?? [],
    });

  } catch {
    return initialState;
  }
}


export function linesFromQuantities(q: Record<string, number>): OrderLine[] {
  return Object.entries(q)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty }));
}

export function quantitiesFromLines(lines: OrderLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  lines.forEach((l) => {
    out[l.productId] = l.qty;
  });
  return out;
}

/**
 * Auto-persist an in-progress one-off order as a draft order, so leaving the
 * flow mid-way never loses the selected products.
 */
function syncDraftOrder(s: PersistedState, draft: CartDraft): PersistedState {
  if (draft.mode !== "order") return { ...s, draft };

  const lines = linesFromQuantities(draft.quantities);
  const linked = draft.orderId ? s.orders.find((o) => o.id === draft.orderId) : undefined;

  // Editing an existing non-draft order: don't touch it until confirmation.
  if (linked && linked.status !== "draft") return { ...s, draft };

  if (lines.length === 0) {
    if (linked) {
      return {
        ...s,
        orders: s.orders.filter((o) => o.id !== linked.id),
        draft: { ...draft, orderId: undefined },
      };
    }
    return { ...s, draft };
  }

  if (linked) {
    return {
      ...s,
      orders: s.orders.map((o) =>
        o.id === linked.id ? { ...o, lines, round: draft.round, date: draft.date ?? o.date } : o,
      ),
      draft,
    };
  }

  const order: Order = {
    id: `o-${Date.now()}`,
    date: draft.date ?? "",
    round: draft.round,
    status: "draft",
    lines,
    createdFrom: "manual",
    cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 12:00",
  };
  return { ...s, orders: [order, ...s.orders], draft: { ...draft, orderId: order.id } };
}


interface StoreValue extends PersistedState {
  hydrated: boolean;
  /* orders */
  getOrder: (id: string) => Order | undefined;
  startOrderDraft: (date: string | undefined, round: RoundId, from?: OrderLine[]) => void;
  editOrder: (id: string) => void;
  confirmDraft: () => Order | RecurringOrder | null;
  cancelOrder: (id: string) => void;
  copyOrderAsNew: (id: string) => void;
  /* recurring */
  getRecurring: (id: string) => RecurringOrder | undefined;
  startRecurringCreate: (name: string, weekdays: number[], round: RoundId, startDate?: string) => void;
  startRecurringEdit: (id: string) => void;
  startOneTimeUpdate: (recurringId: string, date?: string) => void;
  saveRecurringDetails: (id: string, patch: Partial<RecurringOrder>) => void;
  pauseRecurring: (id: string) => void;
  reactivateRecurring: (id: string) => void;
  cancelRecurring: (id: string) => void;
  /* draft / cart */
  draft: CartDraft | null;
  setDraft: (draft: CartDraft | null) => void;
  setQty: (productId: string, qty: number) => void;
  bumpQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  /** discard the in-progress draft, deleting its auto-saved draft order */
  discardDraft: () => void;
  /* business */
  saveBusiness: (patch: Partial<Business>) => void;
  /* admin: customers */
  getCustomer: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id">>) => void;
  setCustomerBlocked: (id: string, blocked: boolean) => void;
  setCustomerPriceOverride: (id: string, productId: string, price: number | null) => void;
  /* admin: catalog */
  moveCategory: (id: string, direction: -1 | 1) => void;
  reorderCategories: (catalog: Category[]) => void;
  renameCategory: (id: string, name: string) => void;
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  addProduct: (categoryId: string, product: Omit<Product, "id">) => void;
  updateProduct: (productId: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (productId: string) => void;
  /* admin: documents */
  documentsForOrder: (orderId: string) => AdminDocument[];
  issueDocument: (orderId: string, type?: DocumentType) => Promise<void>;
  issueDocuments: (orderIds: string[], type?: DocumentType) => Promise<void>;
  /** הזמנות קבועות שנוצרו בשם לקוח */
  adminRecurring: AdminRecurringOrder[];
  /** יצירת הזמנה קבועה בשם לקוח */
  addAdminRecurring: (rec: Omit<AdminRecurringOrder, "id">) => AdminRecurringOrder;
  /** מחיקת הזמנה קבועה שנוצרה בשם לקוח */
  removeAdminRecurring: (id: string) => void;
  /** יצירת הזמנה בשם לקוח (צד המאפייה) */
  addAdminOrder: (order: Omit<Order, "id">) => Order;
  /** עדכון הזמנה קיימת מצד המאפייה (גם הזמנות שהלקוח יצר) */
  updateOrderAsAdmin: (id: string, patch: Partial<Omit<Order, "id">>) => void;
  /* admin: cutoff rules */
  updateCutoffRule: (weekday: number, patch: Partial<Omit<CutoffRule, "weekday">>) => void;
  resetCutoffRules: () => void;
  /** הוספה או עדכון של חריגה לתאריך מסוים */
  saveCutoffException: (exception: CutoffException) => void;
  /** מחיקת חריגה לתאריך */
  removeCutoffException: (date: string) => void;

  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    applyRuntimeCatalog(loaded.catalog);
    applyRuntimeCutoffRules(loaded.cutoffRules);
    applyRuntimeCutoffExceptions(loaded.cutoffExceptions);
    setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripEmptyDraft(state)));
    } catch {
      /* storage unavailable — demo continues in memory */
    }
  }, [state, hydrated]);


  const update = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => {
      const next = fn(s);
      if (next.catalog !== s.catalog) applyRuntimeCatalog(next.catalog);
      if (next.cutoffRules !== s.cutoffRules) applyRuntimeCutoffRules(next.cutoffRules);
      if (next.cutoffExceptions !== s.cutoffExceptions) applyRuntimeCutoffExceptions(next.cutoffExceptions);
      return next;
    });
  }, []);

  /** הפקת מסמכים דרך שכבת החשבונות — יוצרת רשומות "בהפקה" ואז מעדכנת תוצאה. */
  const issueMany = useCallback(
    async (orderIds: string[], type: DocumentType) => {
      if (!orderIds.length) return;
      const createdAt = new Date().toISOString();
      const pending: AdminDocument[] = orderIds.map((orderId, i) => ({
        id: `doc-${Date.now()}-${i}`,
        orderId,
        type,
        status: "pending",
        createdAt,
      }));
      update((s) => ({ ...s, documents: [...pending, ...s.documents] }));

      const adapter = accountingAdapter();
      const results = await Promise.all(
        pending.map(async (doc) => {
          try {
            const res = await adapter.issueDocument({ orderId: doc.orderId, type });
            return { id: doc.id, ...res };
          } catch (err) {
            return {
              id: doc.id,
              status: "error" as const,
              number: undefined,
              error: err instanceof Error ? err.message : "ההפקה נכשלה",
            };
          }
        }),
      );

      update((s) => ({
        ...s,
        documents: s.documents.map((d) => {
          const res = results.find((r) => r.id === d.id);
          return res ? { ...d, status: res.status, number: res.number, error: res.error } : d;
        }),
      }));
    },
    [update],
  );

  const value = useMemo<StoreValue>(() => {
    const getOrder = (id: string) => state.orders.find((o) => o.id === id);
    const getRecurring = (id: string) => state.recurring.find((r) => r.id === id);

    return {
      ...state,
      hydrated,
      getOrder,
      getRecurring,

      startOrderDraft: (date, round, from) =>
        update((s) => {
          const existingDraft = s.orders.find(
            (o) => o.status === "draft" && (date ? o.date === date : !o.date) && o.round === round,
          );
          const quantities = from
            ? quantitiesFromLines(from)
            : existingDraft
              ? quantitiesFromLines(existingDraft.lines)
              : {};
          const draft: CartDraft = {
            ...emptyDraft("order"),
            date,
            round,
            orderId: existingDraft?.id,
            quantities,
          };
          return syncDraftOrder(s, draft);
        }),


      editOrder: (id) =>
        update((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          return {
            ...s,
            draft: {
              mode: "order",
              orderId: order.id,
              date: order.date,
              round: order.round,
              quantities: quantitiesFromLines(order.lines),
            },
          };
        }),

      startRecurringCreate: (name, weekdays, round, startDate) =>
        update((s) => ({
          ...s,
          draft: { ...emptyDraft("recurring_create"), name, weekdays, round, startDate, quantities: {} },
        })),

      startRecurringEdit: (id) =>
        update((s) => {
          const rec = s.recurring.find((r) => r.id === id);
          if (!rec) return s;
          return {
            ...s,
            draft: {
              mode: "recurring_edit",
              recurringId: rec.id,
              name: rec.name,
              weekdays: rec.weekdays,
              round: rec.round,
              quantities: quantitiesFromLines(rec.lines),
            },
          };
        }),

      startOneTimeUpdate: (recurringId, forDate) =>
        update((s) => {
          const rec = s.recurring.find((r) => r.id === recurringId);
          if (!rec) return s;
          const date = forDate ?? nextOccurrence(rec.weekdays) ?? undefined;
          return {
            ...s,
            draft: {
              mode: "onetime",
              recurringId: rec.id,
              name: rec.name,
              date,
              round: rec.round,
              quantities: quantitiesFromLines(rec.lines),
            },
          };
        }),

      confirmDraft: () => {
        let result: Order | RecurringOrder | null = null;
        update((s) => {
          const d = s.draft;
          if (!d) return s;
          const lines = linesFromQuantities(d.quantities);

          if (d.mode === "recurring_create") {
            const rec: RecurringOrder = {
              id: `r-${Date.now()}`,
              name: d.name || "הזמנה קבועה חדשה",
              weekdays: d.weekdays ?? [],
              round: d.round,
              status: "active",
              lines,
              startDate: d.startDate,
            };
            result = rec;
            return { ...s, recurring: [rec, ...s.recurring], draft: null };
          }

          if (d.mode === "recurring_edit" && d.recurringId) {
            const recurring = s.recurring.map((r) =>
              r.id === d.recurringId
                ? {
                    ...r,
                    name: d.name ?? r.name,
                    weekdays: d.weekdays ?? r.weekdays,
                    round: d.round,
                    lines,
                    needsAttention: false,
                    attentionText: undefined,
                  }
                : r,
            );
            result = recurring.find((r) => r.id === d.recurringId) ?? null;
            return { ...s, recurring, draft: null };
          }

          if (d.mode === "onetime" && d.recurringId) {
            const order: Order = {
              id: `o-${Date.now()}`,
              date: d.date ?? nextOccurrence(getRecurring(d.recurringId)?.weekdays ?? []) ?? "2026-08-05",
              round: d.round,
              status: "approved",
              lines,
              createdFrom: "recurring",
              cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 12:00",
            };
            result = order;
            return { ...s, orders: [order, ...s.orders], draft: null };
          }

          // regular order — update existing or create new
          if (d.orderId) {
            const orders = s.orders.map((o) =>
              o.id === d.orderId ? { ...o, lines, round: d.round, date: d.date ?? o.date, status: "approved" as const } : o,
            );
            result = orders.find((o) => o.id === d.orderId) ?? null;
            return { ...s, orders, draft: null };
          }

          const order: Order = {
            id: `o-${Date.now()}`,
            date: d.date ?? "2026-08-05",
            round: d.round,
            status: "approved",
            lines,
            createdFrom: "manual",
            cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 12:00",
          };
          result = order;
          return { ...s, orders: [order, ...s.orders], draft: null };
        });
        return result;
      },

      cancelOrder: (id) =>
        update((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === id ? { ...o, status: "cancelled", closed: true } : o)),
        })),

      copyOrderAsNew: (id) =>
        update((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          return {
            ...s,
            draft: {
              mode: "order",
              date: undefined,
              round: order.round,
              quantities: quantitiesFromLines(order.lines),
            },
          };
        }),

      saveRecurringDetails: (id, patch) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      pauseRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "paused" } : r)),
        })),

      reactivateRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "active" } : r)),
        })),

      cancelRecurring: (id) =>
        update((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)),
        })),

      setDraft: (draft) => update((s) => ({ ...s, draft })),

      setQty: (productId, qty) =>
        update((s) => {
          const draft = s.draft ?? emptyDraft("order");
          const product = findProduct(productId);
          const next = roundQty(qty, product?.unit ?? "unit");
          const quantities = { ...draft.quantities };
          if (next <= 0) delete quantities[productId];
          else quantities[productId] = next;
          return syncDraftOrder(s, { ...draft, quantities });
        }),

      bumpQty: (productId, delta) =>
        update((s) => {
          const draft = s.draft ?? emptyDraft("order");
          const product = findProduct(productId);
          const current = draft.quantities[productId] ?? 0;
          const next = roundQty(current + delta, product?.unit ?? "unit");
          const quantities = { ...draft.quantities };
          if (next <= 0) delete quantities[productId];
          else quantities[productId] = next;
          return syncDraftOrder(s, { ...draft, quantities });
        }),


      clearCart: () =>
        update((s) => (s.draft ? syncDraftOrder(s, { ...s.draft, quantities: {} }) : s)),

      discardDraft: () =>
        update((s) => {
          const id = s.draft?.orderId;
          const orders = id ? s.orders.filter((o) => !(o.id === id && o.status === "draft")) : s.orders;
          return { ...s, orders, draft: null };
        }),


      saveBusiness: (patch) => update((s) => ({ ...s, business: { ...s.business, ...patch } })),

      getCustomer: (id) => state.customers.find((c) => c.id === id),

      addCustomer: (customer) => {
        const created: Customer = { ...customer, id: `cust-${Date.now()}` };
        update((s) => ({ ...s, customers: [...s.customers, created] }));
        return created;
      },

      updateCustomer: (id, patch) =>
        update((s) => ({
          ...s,
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      setCustomerBlocked: (id, blocked) =>
        update((s) => ({
          ...s,
          customers: s.customers.map((c) => (c.id === id ? { ...c, blocked } : c)),
        })),

      setCustomerPriceOverride: (id, productId, price) =>
        update((s) => ({
          ...s,
          customers: s.customers.map((c) => {
            if (c.id !== id) return c;
            const next = { ...(c.priceOverrides ?? {}) };
            if (price === null) delete next[productId];
            else next[productId] = price;
            return { ...c, priceOverrides: next };
          }),
        })),

      moveCategory: (id, direction) =>
        update((s) => {
          const index = s.catalog.findIndex((c) => c.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= s.catalog.length) return s;
          const catalog = [...s.catalog];
          const [moved] = catalog.splice(index, 1);
          catalog.splice(target, 0, moved!);
          return { ...s, catalog };
        }),

      reorderCategories: (catalog) =>
        update((s) => ({
          ...s,
          catalog,
        })),

      renameCategory: (id, name) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      addCategory: (name) =>
        update((s) => ({
          ...s,
          catalog: [...s.catalog, { id: `cat-${Date.now()}`, name, products: [] }],
        })),

      removeCategory: (id) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.filter((c) => !(c.id === id && c.products.length === 0)),
        })),

      addProduct: (categoryId, product) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.map((c) =>
            c.id === categoryId
              ? { ...c, products: [...c.products, { ...product, id: `p-${Date.now()}` }] }
              : c,
          ),
        })),

      updateProduct: (productId, patch) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.map((c) => ({
            ...c,
            products: c.products.map((p) => (p.id === productId ? { ...p, ...patch } : p)),
          })),
        })),

      removeProduct: (productId) =>
        update((s) => ({
          ...s,
          catalog: s.catalog.map((c) => ({
            ...c,
            products: c.products.filter((p) => p.id !== productId),
          })),
        })),

      documentsForOrder: (orderId) => state.documents.filter((d) => d.orderId === orderId),

      issueDocument: (orderId, type = "delivery_note") => issueMany([orderId], type),

      issueDocuments: (orderIds, type = "delivery_note") => issueMany(orderIds, type),

      adminRecurring: state.adminRecurring,

      addAdminRecurring: (rec) => {
        const created: AdminRecurringOrder = { ...rec, id: `ar-${Date.now()}` };
        update((s) => ({ ...s, adminRecurring: [created, ...s.adminRecurring] }));
        return created;
      },

      removeAdminRecurring: (id) =>
        update((s) => ({ ...s, adminRecurring: s.adminRecurring.filter((r) => r.id !== id) })),

      addAdminOrder: (order) => {
        const created: Order = { ...order, id: `ao-${Date.now()}` };
        update((s) => ({ ...s, adminOrders: [created, ...s.adminOrders] }));
        return created;
      },

      updateOrderAsAdmin: (id, patch) =>
        update((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
          adminOrders: s.adminOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),



      updateCutoffRule: (weekday, patch) =>
        update((s) => ({
          ...s,
          cutoffRules: normalizeCutoffRules(
            s.cutoffRules.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
          ),
        })),

      saveCutoffException: (exception) =>
        update((s) => ({
          ...s,
          cutoffExceptions: [
            ...s.cutoffExceptions.filter((e) => e.date !== exception.date),
            exception,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      removeCutoffException: (date) =>
        update((s) => ({
          ...s,
          cutoffExceptions: s.cutoffExceptions.filter((e) => e.date !== date),
        })),

      resetCutoffRules: () => update((s) => ({ ...s, cutoffRules: DEFAULT_CUTOFF_RULES })),

      resetDemoData: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setState(initialState);
      },
    };
  }, [state, hydrated, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}
