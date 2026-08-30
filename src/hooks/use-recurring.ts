import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";
import type { RoundId, Unit } from "@/data/catalog";
import { useAdminOrdersForDate, type AdminOrderView, type CartLineInput } from "@/hooks/use-orders";

export type RecurringStatus = "active" | "paused" | "cancelled";

export interface RecurringLine {
  productId: string;
  qty: number;
}

export interface RecurringOrder {
  id: string;
  customerId: string;
  name: string;
  /** 0 = ראשון … 6 = שבת */
  weekdays: number[];
  round: RoundId;
  status: RecurringStatus;
  startDate: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  lines: RecurringLine[];
}

type RecurringLineRow = { product_id: string; qty: number };

type RecurringRow = {
  id: string;
  customer_id: string;
  name: string;
  weekdays: number[];
  round: string;
  status: string;
  start_date: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  recurring_order_lines: RecurringLineRow[];
};

const RECURRING_SELECT =
  "id, customer_id, name, weekdays, round, status, start_date, note, created_by, created_at, recurring_order_lines(product_id, qty)";

function toRecurring(row: RecurringRow): RecurringOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    weekdays: row.weekdays,
    round: row.round as RoundId,
    status: row.status as RecurringStatus,
    startDate: row.start_date,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    lines: (row.recurring_order_lines ?? []).map((l) => ({ productId: l.product_id, qty: l.qty })),
  };
}

export const myRecurringQueryKey = ["recurring", "mine"] as const;
export const recurringQueryKey = (id: string) => ["recurring", id] as const;
export const customerRecurringQueryKey = (customerId: string) => ["recurring", "byCustomer", customerId] as const;
export const recurringOccurrencesQueryKey = (date: string) => ["recurring", "occurrences", date] as const;

/** כל ההזמנות הקבועות של הלקוח המחובר (RLS מסנן — אין צורך בסינון מפורש). */
export function useMyRecurring() {
  const query = useQuery({
    queryKey: myRecurringQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_orders")
        .select(RECURRING_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toRecurring(row as RecurringRow));
    },
  });
  return { recurring: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** הזמנה קבועה בודדת — עובד גם ללקוח (שלו בלבד) וגם לניהול (כל אחת), לפי RLS. */
export function useRecurring(id: string | undefined) {
  const query = useQuery({
    queryKey: recurringQueryKey(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_orders")
        .select(RECURRING_SELECT)
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return toRecurring(data as RecurringRow);
    },
  });
  return { recurring: query.data, isLoading: query.isLoading, error: query.error };
}

/** הזמנות קבועות של לקוח נתון (לצד הניהול, כרטיס הלקוח). */
export function useCustomerRecurring(customerId: string | undefined) {
  const query = useQuery({
    queryKey: customerRecurringQueryKey(customerId ?? ""),
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_orders")
        .select(RECURRING_SELECT)
        .eq("customer_id", customerId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toRecurring(row as RecurringRow));
    },
  });
  return { recurring: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

function useInvalidateRecurring() {
  const queryClient = useQueryClient();
  return (id?: string, customerId?: string) => {
    void queryClient.invalidateQueries({ queryKey: myRecurringQueryKey });
    void queryClient.invalidateQueries({ queryKey: ["recurring", "occurrences"] });
    if (id) void queryClient.invalidateQueries({ queryKey: recurringQueryKey(id) });
    if (customerId) void queryClient.invalidateQueries({ queryKey: customerRecurringQueryKey(customerId) });
  };
}

export interface CreateRecurringInput {
  customerId: string;
  name: string;
  weekdays: number[];
  round: RoundId;
  startDate: string | null;
  note?: string | undefined;
  lines: RecurringLine[];
}

/** יצירת הזמנה קבועה — ישות אחת בין לקוח לניהול (PRD §2.4). */
export function useCreateRecurring() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const { data, error } = await supabase
        .from("recurring_orders")
        .insert({
          customer_id: input.customerId,
          name: input.name,
          weekdays: input.weekdays,
          round: input.round,
          start_date: input.startDate,
          note: input.note || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.lines.length > 0) {
        const { error: linesError } = await supabase.from("recurring_order_lines").insert(
          input.lines.map((line) => ({
            recurring_id: data.id,
            product_id: line.productId,
            qty: line.qty,
          })),
        );
        if (linesError) throw linesError;
      }
      return data.id as string;
    },
    onSuccess: (_data, input) => invalidate(undefined, input.customerId),
  });
}

export interface RecurringDetailsInput {
  name: string;
  weekdays: number[];
  round: RoundId;
  note?: string | undefined;
}

/** עריכת פרטי התבנית (שם/ימים/סבב/הערה) — לא נוגעת בשורות המוצרים. */
export function useUpdateRecurringDetails() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecurringDetailsInput }) => {
      const { error } = await supabase
        .from("recurring_orders")
        .update({
          name: input.name,
          weekdays: input.weekdays,
          round: input.round,
          note: input.note || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

/** מחליף את כל שורות המוצרים של התבנית (מחיקה מלאה + הכנסה מחדש). */
export function useUpdateRecurringLines() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, lines }: { id: string; lines: RecurringLine[] }) => {
      const { error: deleteError } = await supabase.from("recurring_order_lines").delete().eq("recurring_id", id);
      if (deleteError) throw deleteError;
      if (lines.length > 0) {
        const { error: insertError } = await supabase.from("recurring_order_lines").insert(
          lines.map((line) => ({ recurring_id: id, product_id: line.productId, qty: line.qty })),
        );
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

function useSetRecurringStatus() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecurringStatus }) => {
      const { error } = await supabase.from("recurring_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function usePauseRecurring() {
  const setStatus = useSetRecurringStatus();
  return { mutate: (id: string) => setStatus.mutate({ id, status: "paused" }) };
}

export function useResumeRecurring() {
  const setStatus = useSetRecurringStatus();
  return { mutate: (id: string) => setStatus.mutate({ id, status: "active" }) };
}

export function useCancelRecurring() {
  const setStatus = useSetRecurringStatus();
  return { mutate: (id: string) => setStatus.mutate({ id, status: "cancelled" }) };
}

/* --- virtual occurrences (admin) --- */

type OccurrenceRow = {
  recurring_id: string;
  customer_id: string;
  name: string;
  round: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  unit: string;
  qty: number;
  unit_price: number;
};

/** מרחיב `virtual:` synthetic id: "virtual:{recurringId}:{date}". */
export function virtualOrderId(recurringId: string, date: string): string {
  return `virtual:${recurringId}:${date}`;
}

export function parseVirtualOrderId(id: string): { recurringId: string; date: string } | null {
  const match = /^virtual:([^:]+):(.+)$/.exec(id);
  return match ? { recurringId: match[1]!, date: match[2]! } : null;
}

/** ההזמנות הקבועות ה"וירטואליות" שחלות על תאריך נתון, בצורת `AdminOrderView` — כדי שכל
 * מסך ניהול שכבר יודע לרנדר `AdminOrderView[]` יציג אותן בלי קוד ייעודי. */
export function useRecurringOccurrencesForDate(date: string) {
  const query = useQuery({
    queryKey: recurringOccurrencesQueryKey(date),
    queryFn: async (): Promise<AdminOrderView[]> => {
      const { data, error } = await supabase.rpc("fn_recurring_occurrences", { p_date: date });
      if (error) throw error;
      const rows = (data ?? []) as OccurrenceRow[];

      const byRecurring = new Map<string, OccurrenceRow[]>();
      for (const row of rows) {
        const list = byRecurring.get(row.recurring_id) ?? [];
        list.push(row);
        byRecurring.set(row.recurring_id, list);
      }

      return Array.from(byRecurring.entries()).map(([recurringId, group]) => {
        const first = group[0]!;
        const lines: CartLineInput[] = group.map((r) => ({
          productId: r.product_id,
          productName: r.product_name,
          sku: r.sku,
          unit: r.unit as Unit,
          qty: r.qty,
          unitPrice: r.unit_price,
        }));
        const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
        return {
          order: {
            id: virtualOrderId(recurringId, date),
            customerId: first.customer_id,
            date,
            round: first.round as RoundId,
            status: "approved",
            note: first.note,
            source: "recurring",
            recurringId,
            createdBy: first.created_by,
            createdAt: first.created_at,
            lines,
          },
          customerName: "",
          customerCode: null,
          customerAddress: null,
          customerPhone: null,
          itemsCount: lines.length,
          total,
          isVirtual: true,
        } satisfies AdminOrderView;
      });
    },
  });
  return { views: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** הזמנות ליום נתון, אמיתיות + וירטואליות (הזמנות קבועות) יחד — נקודת האינטגרציה היחידה
 * לכל מסך ניהול שמציג הזמנות לתאריך (PRD §2.4: "לא רשימה נפרדת"). ה-customerName/Code/
 * Address/Phone של שורה וירטואלית מתמלאים כאן מ-`useCustomers`-style join כי
 * `fn_recurring_occurrences` לא כולל אותם — נשלף פעם אחת מ-`customers` ומוזג. */
export function useAdminOrdersForDateWithRecurring(date: string) {
  const real = useAdminOrdersForDate(date);
  const virtual = useRecurringOccurrencesForDate(date);
  const customerIds = Array.from(new Set(virtual.views.map((v) => v.order.customerId)));

  const customersQuery = useQuery({
    queryKey: ["recurring", "occurrence-customers", customerIds.slice().sort()] as const,
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, code, address, customer_contacts(phone, is_primary)")
        .in("id", customerIds);
      if (error) throw error;
      const map = new Map<string, { name: string; code: string | null; address: string | null; phone: string | null }>();
      for (const row of data ?? []) {
        const contacts = row.customer_contacts ?? [];
        const phone = contacts.find((c) => c.is_primary)?.phone ?? contacts[0]?.phone ?? null;
        map.set(row.id, { name: row.name, code: row.code, address: row.address, phone });
      }
      return map;
    },
  });

  const enrichedVirtual = virtual.views.map((v) => {
    const info = customersQuery.data?.get(v.order.customerId);
    return {
      ...v,
      customerName: info?.name ?? "לקוח לא ידוע",
      customerCode: info?.code ?? null,
      customerAddress: info?.address ?? null,
      customerPhone: info?.phone ?? null,
    };
  });

  const views = [...real.views, ...enrichedVirtual].sort((a, b) =>
    (b.order.createdAt ?? "").localeCompare(a.order.createdAt ?? ""),
  );

  return {
    views,
    isLoading: real.isLoading || virtual.isLoading || (customerIds.length > 0 && customersQuery.isLoading),
  };
}

/* --- materialization (admin) --- */

export interface MaterializePatch {
  cancel?: boolean;
  note?: string | undefined;
  lines?: { productId: string; qty: number }[] | undefined;
}

/** הופכת מופע וירטואלי לרשומת `orders` אמיתית (PRD §4.1-4.3). */
export function useMaterializeRecurringOccurrence() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({
      recurringId,
      date,
      patch,
    }: {
      recurringId: string;
      date: string;
      patch?: MaterializePatch | undefined;
    }) => {
      const p_patch = patch
        ? {
            cancel: patch.cancel,
            note: patch.note,
            lines: patch.lines?.map((l) => ({ product_id: l.productId, qty: l.qty })),
          }
        : null;
      const { data, error } = await supabase.rpc("rpc_materialize_recurring_occurrence", {
        p_recurring_id: recurringId,
        p_date: date,
        p_patch: p_patch,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(),
  });
}
