import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";
import type { RoundId, Unit } from "@/data/catalog";

export type OrderStatus = "draft" | "approved" | "completed" | "cancelled";
export type OrderSource = "manual" | "recurring" | "admin";

export interface OrderLine {
  productId: string;
  productName: string;
  sku: string | null;
  unit: Unit;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  /** null רק לעגלה פתוחה שעוד לא נבחר לה תאריך (טיוטה, ראו PRD §2.3). */
  date: string | null;
  round: RoundId;
  status: OrderStatus;
  note: string | null;
  source: OrderSource;
  recurringId: string | null;
  createdBy: string | null;
  createdAt: string;
  lines: OrderLine[];
}

export interface AdminOrderView {
  order: Order;
  customerName: string;
  customerCode: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  itemsCount: number;
  total: number;
  /** הזמנה קבועה שעדיין לא מומשה לרשומת `orders` אמיתית — מחושבת חי, לא נשמרה (PRD §2.4).
   * ראו `useRecurringOccurrencesForDate`/`useAdminOrdersForDateWithRecurring` ב-use-recurring.ts. */
  isVirtual?: boolean | undefined;
}

type OrderLineRow = {
  product_id: string;
  product_name: string;
  sku: string | null;
  unit: string;
  qty: number;
  unit_price: number;
};

type OrderRow = {
  id: string;
  customer_id: string;
  delivery_date: string | null;
  round: string;
  status: string;
  note: string | null;
  source: string;
  recurring_id: string | null;
  created_by: string | null;
  created_at: string;
  order_lines: OrderLineRow[];
};

function toOrderLine(row: OrderLineRow): OrderLine {
  return {
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    unit: row.unit as Unit,
    qty: row.qty,
    unitPrice: row.unit_price,
  };
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    date: row.delivery_date,
    round: row.round as RoundId,
    status: row.status as OrderStatus,
    note: row.note,
    source: row.source as OrderSource,
    recurringId: row.recurring_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    lines: (row.order_lines ?? []).map(toOrderLine),
  };
}

function orderTotal(order: Order): number {
  return order.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
}

function itemsCount(order: Order): number {
  return order.lines.length;
}

/** תאריך אספקה ודאי — לשימוש רק כשההזמנה ידועה כלא-טיוטה (אכיפת DB: `delivery_date`
 * חייב להיות לא-null לכל סטטוס מלבד draft). זורק אם ההנחה הופרה, במקום להסתיר null בשקט. */
export function orderDate(order: Order): string {
  if (order.date === null) throw new Error(`order ${order.id} has no delivery date`);
  return order.date;
}

const ORDER_SELECT =
  "id, customer_id, delivery_date, round, status, note, source, recurring_id, created_by, created_at, order_lines(product_id, product_name, sku, unit, qty, unit_price)";

export const myOrdersQueryKey = ["orders", "mine"] as const;
export const orderQueryKey = (id: string) => ["orders", id] as const;
export const cartOrderQueryKey = ["orders", "cart"] as const;
export const adminOrdersForDateQueryKey = (date: string) => ["orders", "admin", "date", date] as const;
export const recentAdminOrdersQueryKey = ["orders", "admin", "recent"] as const;

/** כל ההזמנות של הלקוח המחובר (RLS מסנן — אין צורך בסינון מפורש). */
export function useMyOrders() {
  const query = useQuery({
    queryKey: myOrdersQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toOrder(row as OrderRow));
    },
  });
  return { orders: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** הזמנה בודדת — עובד גם ללקוח (הזמנה שלו בלבד) וגם לניהול (כל הזמנה), לפי RLS. */
export function useOrder(id: string | undefined) {
  const query = useQuery({
    queryKey: orderQueryKey(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return toOrder(data as OrderRow);
    },
  });
  return { order: query.data, isLoading: query.isLoading, error: query.error };
}

/** העגלה הפתוחה של הלקוח המחובר (status=draft, בלי תאריך) — אם קיימת. */
export function useCartOrder() {
  const query = useQuery({
    queryKey: cartOrderQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("status", "draft")
        .is("delivery_date", null)
        .maybeSingle();
      if (error) throw error;
      return data ? toOrder(data as OrderRow) : null;
    },
  });
  return { cart: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

type CustomerJoin = {
  name: string;
  code: string | null;
  address: string | null;
  customer_contacts: { phone: string | null; is_primary: boolean }[];
};

const CUSTOMER_JOIN_SELECT = "customers(name, code, address, customer_contacts(phone, is_primary))";

function extractCustomer(row: unknown): CustomerJoin | null {
  return (row as { customers: CustomerJoin | null }).customers;
}

function primaryPhone(customer: CustomerJoin | null): string | null {
  const contacts = customer?.customer_contacts ?? [];
  return contacts.find((c) => c.is_primary)?.phone ?? contacts[0]?.phone ?? null;
}

function toAdminOrderView(row: OrderRow, customer: CustomerJoin | null): AdminOrderView {
  const order = toOrder(row);
  return {
    order,
    customerName: customer?.name ?? "לקוח לא ידוע",
    customerCode: customer?.code ?? null,
    customerAddress: customer?.address ?? null,
    customerPhone: primaryPhone(customer),
    itemsCount: itemsCount(order),
    total: orderTotal(order),
  };
}

/** הזמנות ליום אספקה נתון, לצד הניהול — בלי טיוטות/מבוטלות (אלה שרלוונטיות לרשימת היום). */
export function useAdminOrdersForDate(date: string) {
  const query = useQuery({
    queryKey: adminOrdersForDateQueryKey(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .eq("delivery_date", date)
        .not("status", "in", "(draft,cancelled)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toAdminOrderView(row as OrderRow, extractCustomer(row)));
    },
  });
  return { views: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** כל ההזמנות של לקוח נתון (לצד הניהול, כרטיס הלקוח) — בלי טיוטות, מהחדשה לישנה. */
export function useCustomerOrders(customerId: string | undefined) {
  const query = useQuery({
    queryKey: ["orders", "admin", "byCustomer", customerId ?? ""] as const,
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .eq("customer_id", customerId as string)
        .not("status", "eq", "draft")
        .order("delivery_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toAdminOrderView(row as OrderRow, extractCustomer(row)));
    },
  });
  return { views: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** הזמנה בודדת לצד הניהול, עם שם/כתובת/טלפון הלקוח. */
export function useAdminOrderView(orderId: string | undefined) {
  const query = useQuery({
    queryKey: ["orders", "admin", "view", orderId ?? ""] as const,
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .eq("id", orderId as string)
        .single();
      if (error) throw error;
      return toAdminOrderView(data as OrderRow, extractCustomer(data));
    },
  });
  return { view: query.data, isLoading: query.isLoading, error: query.error };
}

/** פיד "הזמנות שנכנסו" לדף הבית של הניהול — ההזמנות האחרונות שאושרו, בכל תאריך אספקה. */
export function useRecentAdminOrders(limit = 30) {
  const query = useQuery({
    queryKey: recentAdminOrdersQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .not("status", "in", "(draft,cancelled)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => toAdminOrderView(row as OrderRow, extractCustomer(row)));
    },
  });
  return { views: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** טיוטות שכבר נבחר להן תאריך אך טרם אושרו, בכל הלקוחות — "דורש טיפול" בדף הבית של
 * הניהול. טיוטה בלי תאריך היא רק עגלה שהלקוח עדיין לא סיים למלא, לא פעולה תקועה. */
export function useAdminStalledDrafts() {
  const query = useQuery({
    queryKey: ["orders", "admin", "stalled-drafts"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .eq("status", "draft")
        .not("delivery_date", "is", null)
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => toAdminOrderView(row as OrderRow, extractCustomer(row)));
    },
  });
  return { views: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** הזמנות ספציפיות לפי מזהה, בכל סטטוס — לצורך יומן המסמכים (מסמך יכול להצביע גם על
 * הזמנה שבינתיים בוטלה). */
export function useOrdersByIds(orderIds: string[]) {
  const query = useQuery({
    queryKey: ["orders", "admin", "byIds", [...orderIds].sort()] as const,
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`${ORDER_SELECT}, ${CUSTOMER_JOIN_SELECT}`)
        .in("id", orderIds);
      if (error) throw error;
      const map = new Map<string, AdminOrderView>();
      for (const row of data ?? []) {
        const view = toAdminOrderView(row as OrderRow, extractCustomer(row));
        map.set(view.order.id, view);
      }
      return map;
    },
  });
  return { viewsById: query.data ?? new Map<string, AdminOrderView>(), isLoading: query.isLoading };
}

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return (orderId?: string, date?: string) => {
    void queryClient.invalidateQueries({ queryKey: myOrdersQueryKey });
    void queryClient.invalidateQueries({ queryKey: cartOrderQueryKey });
    void queryClient.invalidateQueries({ queryKey: ["orders", "admin"] });
    if (orderId) void queryClient.invalidateQueries({ queryKey: orderQueryKey(orderId) });
    if (date) void queryClient.invalidateQueries({ queryKey: adminOrdersForDateQueryKey(date) });
  };
}

/** מוצא את העגלה הפתוחה של הלקוח, או יוצר אחת חדשה. עמיד למרוץ כפול (double-tap) מול
 * האינדקס הייחודי החלקי `orders_one_open_cart_per_customer`. */
async function getOrCreateCartOrderId(customerId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "draft")
    .is("delivery_date", null)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("orders")
    .insert({ customer_id: customerId, status: "draft", round: "morning" })
    .select("id")
    .single();
  if (!insertError) return created.id;

  if (insertError.code === "23505") {
    const { data: retry, error: retryError } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "draft")
      .is("delivery_date", null)
      .single();
    if (retryError) throw retryError;
    return retry.id;
  }
  throw insertError;
}

export interface CartLineInput {
  productId: string;
  productName: string;
  sku: string | null;
  unit: Unit;
  qty: number;
  unitPrice: number;
}

/** עדכון כמות מוצר בעגלה — יוצר את העגלה אם עוד אין, מוחק שורה כש-qty=0. */
export function useUpsertCartLine() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ customerId, line }: { customerId: string; line: CartLineInput }) => {
      const cartId = await getOrCreateCartOrderId(customerId);
      if (line.qty <= 0) {
        const { error } = await supabase
          .from("order_lines")
          .delete()
          .eq("order_id", cartId)
          .eq("product_id", line.productId);
        if (error) throw error;
        return cartId;
      }
      const { error } = await supabase.from("order_lines").upsert(
        {
          order_id: cartId,
          product_id: line.productId,
          product_name: line.productName,
          sku: line.sku,
          unit: line.unit,
          qty: line.qty,
          unit_price: line.unitPrice,
        },
        { onConflict: "order_id,product_id" },
      );
      if (error) throw error;
      return cartId;
    },
    onSuccess: () => invalidate(),
  });
}

/** מוסיף כמה שורות בבת אחת לעגלה (למשל בזרימת "העתקת הזמנה קודמת"). */
export function useAddCartLines() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ customerId, lines }: { customerId: string; lines: CartLineInput[] }) => {
      const cartId = await getOrCreateCartOrderId(customerId);
      if (lines.length === 0) return cartId;
      const { error } = await supabase.from("order_lines").upsert(
        lines.map((line) => ({
          order_id: cartId,
          product_id: line.productId,
          product_name: line.productName,
          sku: line.sku,
          unit: line.unit,
          qty: line.qty,
          unit_price: line.unitPrice,
        })),
        { onConflict: "order_id,product_id" },
      );
      if (error) throw error;
      return cartId;
    },
    onSuccess: () => invalidate(),
  });
}

export function useSetCartDateRound() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ orderId, date, round }: { orderId: string; date: string; round: RoundId }) => {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_date: date, round })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export function useSetCartNote() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ note: note || null })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** מוחק את העגלה הפתוחה (ביטול הזמנה בטיוטה). */
export function useDiscardCart() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** אישור ההזמנה — קורא ל-rpc_confirm_order (ולידציה + snapshot מחירים בשרת). */
export function useConfirmOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc("rpc_confirm_order", { p_order_id: orderId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
  });
}

/** שכפול הזמנה קיימת כעגלה חדשה (ללא קשר להזמנה המקורית). */
export function useCopyOrderAsNew() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ customerId, source }: { customerId: string; source: Order }) => {
      const cartId = await getOrCreateCartOrderId(customerId);
      if (source.lines.length === 0) return cartId;
      const { error } = await supabase.from("order_lines").upsert(
        source.lines.map((line) => ({
          order_id: cartId,
          product_id: line.productId,
          product_name: line.productName,
          sku: line.sku,
          unit: line.unit,
          qty: line.qty,
          unit_price: line.unitPrice,
        })),
        { onConflict: "order_id,product_id" },
      );
      if (error) throw error;
      return cartId;
    },
    onSuccess: () => invalidate(),
  });
}

/* --- admin --- */

export function useCancelOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_data, orderId) => invalidate(orderId),
  });
}

export function useRestoreOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_data, orderId) => invalidate(orderId),
  });
}

/** עריכת אדמין: מחליף את כל שורות ההזמנה (מחיקה מלאה + הכנסה מחדש — פשוט ובטוח מספיק
 * לזרימת עריכה ידנית בודדת). המחירים כבר snapshot-ים סופיים (לא נדרסים ב-confirm — ההזמנה
 * כבר approved). */
export function useAdminUpdateOrderLines() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({
      orderId,
      lines,
      note,
    }: {
      orderId: string;
      lines: CartLineInput[];
      note?: string | undefined;
    }) => {
      const { error: deleteError } = await supabase.from("order_lines").delete().eq("order_id", orderId);
      if (deleteError) throw deleteError;
      if (lines.length > 0) {
        const { error: insertError } = await supabase.from("order_lines").insert(
          lines.map((line) => ({
            order_id: orderId,
            product_id: line.productId,
            product_name: line.productName,
            sku: line.sku,
            unit: line.unit,
            qty: line.qty,
            unit_price: line.unitPrice,
          })),
        );
        if (insertError) throw insertError;
      }
      if (note !== undefined) {
        const { error: noteError } = await supabase.from("orders").update({ note: note || null }).eq("id", orderId);
        if (noteError) throw noteError;
      }
    },
    onSuccess: (_data, { orderId }) => invalidate(orderId),
  });
}

export interface AdminCreateOrderInput {
  customerId: string;
  date: string;
  round: RoundId;
  note?: string | undefined;
  createdBy: string;
  lines: CartLineInput[];
}

/** יצירת הזמנה בשם לקוח מצד הניהול — ישירות `approved`, בלי RPC (הניהול לא כפוף לאכיפת
 * cutoff/חסימה/הרשאת-סבב, ראו PRD §2.2). */
export function useAdminCreateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (input: AdminCreateOrderInput) => {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          customer_id: input.customerId,
          delivery_date: input.date,
          round: input.round,
          status: "approved",
          note: input.note || null,
          source: "admin",
          created_by: input.createdBy,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.lines.length > 0) {
        const { error: linesError } = await supabase.from("order_lines").insert(
          input.lines.map((line) => ({
            order_id: data.id,
            product_id: line.productId,
            product_name: line.productName,
            sku: line.sku,
            unit: line.unit,
            qty: line.qty,
            unit_price: line.unitPrice,
          })),
        );
        if (linesError) throw linesError;
      }
      return data.id;
    },
    onSuccess: (_data, input) => invalidate(undefined, input.date),
  });
}
