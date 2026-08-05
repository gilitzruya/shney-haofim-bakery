import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { BUSINESS } from "@/data/catalog";
import type { RoundId } from "@/data/catalog";
import { SEED_ORDERS, SEED_RECURRING } from "@/data/seed";
import type { Order, OrderLine, RecurringOrder } from "@/data/seed";
import { nextOccurrence, roundQty } from "@/lib/format";
import { findProduct } from "@/data/catalog";

const STORAGE_KEY = "bakery-demo-state:v2";

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
}

const emptyDraft = (mode: CartMode = "order"): CartDraft => ({
  mode,
  round: "morning",
  quantities: {},
});

const initialState: PersistedState = {
  orders: SEED_ORDERS,
  recurring: SEED_RECURRING,
  business: BUSINESS,
  draft: null,
};

function loadState(): PersistedState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      orders: parsed.orders ?? SEED_ORDERS,
      recurring: parsed.recurring ?? SEED_RECURRING,
      business: parsed.business ?? BUSINESS,
      draft: parsed.draft ?? null,
    };
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
    cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 14:00",
  };
  return { ...s, orders: [order, ...s.orders], draft: { ...draft, orderId: order.id } };
}


interface StoreValue extends PersistedState {
  hydrated: boolean;
  /* orders */
  getOrder: (id: string) => Order | undefined;
  startOrderDraft: (date: string, round: RoundId, from?: OrderLine[]) => void;
  editOrder: (id: string) => void;
  confirmDraft: () => Order | RecurringOrder | null;
  cancelOrder: (id: string) => void;
  copyOrderAsNew: (id: string) => void;
  /* recurring */
  getRecurring: (id: string) => RecurringOrder | undefined;
  startRecurringCreate: (name: string, weekdays: number[], round: RoundId) => void;
  startRecurringEdit: (id: string) => void;
  startOneTimeUpdate: (recurringId: string) => void;
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
  /* business */
  saveBusiness: (patch: Partial<Business>) => void;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — demo continues in memory */
    }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((s) => fn(s));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const getOrder = (id: string) => state.orders.find((o) => o.id === id);
    const getRecurring = (id: string) => state.recurring.find((r) => r.id === id);

    return {
      ...state,
      hydrated,
      getOrder,
      getRecurring,

      startOrderDraft: (date, round, from) =>
        update((s) => ({
          ...s,
          draft: {
            ...emptyDraft("order"),
            date,
            round,
            quantities: from ? quantitiesFromLines(from) : {},
          },
        })),

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

      startRecurringCreate: (name, weekdays, round) =>
        update((s) => ({
          ...s,
          draft: { ...emptyDraft("recurring_create"), name, weekdays, round, quantities: {} },
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

      startOneTimeUpdate: (recurringId) =>
        update((s) => {
          const rec = s.recurring.find((r) => r.id === recurringId);
          if (!rec) return s;
          const date = nextOccurrence(rec.weekdays) ?? undefined;
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
              cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 14:00",
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
            cutoffText: "ניתן לעדכן עד יום לפני האספקה בשעה 14:00",
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
          if (!s.draft) return s;
          const product = findProduct(productId);
          const next = roundQty(qty, product?.unit ?? "unit");
          const quantities = { ...s.draft.quantities };
          if (next <= 0) delete quantities[productId];
          else quantities[productId] = next;
          return syncDraftOrder(s, { ...s.draft, quantities });
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


      saveBusiness: (patch) => update((s) => ({ ...s, business: { ...s.business, ...patch } })),

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
