import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/api/client";
import { grantContactAccess, revokeContactAccess } from "@/lib/customers/access-server";
import type { RoundId } from "@/data/catalog";
import { toE164 } from "@/lib/phone";

export interface CustomerContact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  /** נגזר: קיימת שורת `app_users` עם אותו טלפון — לא שדה שמור, כדי שלא יוכל לצאת מסונכרן. */
  hasAccess: boolean;
}

export interface Customer {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  deliveryNotes: string | null;
  businessId: string | null;
  allowedRounds: RoundId[];
  blocked: boolean;
  contacts: CustomerContact[];
}

export const customersQueryKey = ["customers"] as const;
export const customerQueryKey = (id: string) => ["customers", id] as const;
export const myCustomerQueryKey = ["customers", "me"] as const;
export const customerPricesQueryKey = (customerId: string | null) =>
  ["customer-prices", customerId] as const;

type CustomerRow = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  delivery_notes: string | null;
  business_id: string | null;
  allowed_rounds: string[];
  blocked: boolean;
};

function toCustomer(row: CustomerRow, contacts: CustomerContact[] = []): Customer {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    deliveryNotes: row.delivery_notes,
    businessId: row.business_id,
    allowedRounds: row.allowed_rounds as RoundId[],
    blocked: row.blocked,
    contacts,
  };
}

async function fetchAccessPhones(phones: string[]): Promise<Set<string>> {
  if (phones.length === 0) return new Set();
  const { data, error } = await supabase.from("app_users").select("phone").in("phone", phones);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.phone));
}

async function fetchContacts(customerId: string): Promise<CustomerContact[]> {
  const { data, error } = await supabase
    .from("customer_contacts")
    .select("id, name, phone, email, is_primary")
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false });
  if (error) throw error;

  const phones = (data ?? []).map((c) => c.phone).filter((p): p is string => !!p);
  const withAccess = await fetchAccessPhones(phones);

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    isPrimary: c.is_primary,
    hasAccess: !!c.phone && withAccess.has(c.phone),
  }));
}

/** רשימת הלקוחות לצד הניהול (בלי אנשי קשר — נטענים בכרטיס הלקוח בנפרד). */
export function useCustomers() {
  const query = useQuery({
    queryKey: customersQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, code, name, address, delivery_notes, business_id, allowed_rounds, blocked, customer_contacts(id, name, phone, email, is_primary)",
        )
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const contacts = (row.customer_contacts ?? [])
          .slice()
          .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
          .map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            isPrimary: c.is_primary,
            // "יש גישה" לא מחושב כאן — יקר מדי לכל שורה ברשימה, ולא מוצג בה. מוצג רק
            // בכרטיס הלקוח (useCustomer), שם הוא נגזר במדויק מ-app_users.
            hasAccess: false,
          }));
        return toCustomer(row, contacts);
      });
    },
  });
  return { customers: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** כרטיס לקוח מלא, כולל אנשי קשר עם דגל "יש גישה" נגזר. */
export function useCustomer(id: string | undefined) {
  const query = useQuery({
    queryKey: customerQueryKey(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("customers")
        .select("id, code, name, address, delivery_notes, business_id, allowed_rounds, blocked")
        .eq("id", id as string)
        .single();
      if (error) throw error;
      const contacts = await fetchContacts(row.id);
      return toCustomer(row, contacts);
    },
  });
  return { customer: query.data, isLoading: query.isLoading, error: query.error };
}

/** הלקוח המחובר עצמו (לפי RLS — אין צורך בסינון מפורש). */
export function useMyCustomer() {
  const query = useQuery({
    queryKey: myCustomerQueryKey,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("customers")
        .select("id, code, name, address, delivery_notes, business_id, allowed_rounds, blocked")
        .single();
      if (error) throw error;
      const contacts = await fetchContacts(row.id);
      return toCustomer(row, contacts);
    },
  });
  return { customer: query.data, isLoading: query.isLoading, error: query.error };
}

/** מפת מחירים מיוחדים (productId → price) ללקוח נתון. */
export function useCustomerPriceMap(customerId: string | null | undefined) {
  const query = useQuery({
    queryKey: customerPricesQueryKey(customerId ?? null),
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_prices")
        .select("product_id, price")
        .eq("customer_id", customerId as string);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.product_id] = row.price;
      return map;
    },
  });
  return query.data ?? {};
}

/** מחירי הלקוח המחובר עצמו — RLS מחזיר רק את השורות שלו, בלי סינון מפורש. */
export function useMyPrices() {
  const query = useQuery({
    queryKey: ["customer-prices", "me"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_prices").select("product_id, price");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.product_id] = row.price;
      return map;
    },
  });
  return query.data ?? {};
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: customersQueryKey });
    if (id) void queryClient.invalidateQueries({ queryKey: customerQueryKey(id) });
  };
}

export interface CustomerFormInput {
  code?: string | undefined;
  name: string;
  address?: string | undefined;
  deliveryNotes?: string | undefined;
  businessId?: string | undefined;
  allowedRounds: RoundId[];
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async (input: CustomerFormInput) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          code: input.code || null,
          name: input.name,
          address: input.address || null,
          delivery_notes: input.deliveryNotes || null,
          business_id: input.businessId || null,
          allowed_rounds: input.allowedRounds,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CustomerFormInput }) => {
      const { error } = await supabase
        .from("customers")
        .update({
          code: input.code || null,
          name: input.name,
          address: input.address || null,
          delivery_notes: input.deliveryNotes || null,
          business_id: input.businessId || null,
          allowed_rounds: input.allowedRounds,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useSetCustomerBlocked() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("customers").update({ blocked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useSetCustomerPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      productId,
      price,
    }: {
      customerId: string;
      productId: string;
      price: number | null;
    }) => {
      if (price === null) {
        const { error } = await supabase
          .from("customer_prices")
          .delete()
          .eq("customer_id", customerId)
          .eq("product_id", productId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("customer_prices")
        .upsert({ customer_id: customerId, product_id: productId, price }, { onConflict: "customer_id,product_id" });
      if (error) throw error;
    },
    onSuccess: (_data, { customerId }) =>
      queryClient.invalidateQueries({ queryKey: customerPricesQueryKey(customerId) }),
  });
}

export interface ContactInput {
  name: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export function useAddContact() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ customerId, input }: { customerId: string; input: ContactInput }) => {
      const { error } = await supabase.from("customer_contacts").insert({
        customer_id: customerId,
        name: input.name || null,
        // מנורמל ל-E.164 כדי להתאים תמיד לפורמט ש-app_users.phone נשמר בו (grantContactAccess
        // מנרמל גם הוא) — אחרת "יש לו גישה" (הנגזר מהתאמת המספרים) יוצא שגוי.
        phone: input.phone ? toE164(input.phone) : null,
        email: input.email || null,
        is_primary: input.isPrimary,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { customerId }) => invalidate(customerId),
  });
}

export function useUpdateContact() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({
      customerId,
      contactId,
      input,
    }: {
      customerId: string;
      contactId: string;
      input: ContactInput;
    }) => {
      const { error } = await supabase
        .from("customer_contacts")
        .update({
          name: input.name || null,
          phone: input.phone ? toE164(input.phone) : null,
          email: input.email || null,
          is_primary: input.isPrimary,
        })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: (_data, { customerId }) => invalidate(customerId),
  });
}

export function useRemoveContact() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ customerId, contactId }: { customerId: string; contactId: string }) => {
      const { error } = await supabase.from("customer_contacts").delete().eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: (_data, { customerId }) => invalidate(customerId),
  });
}

export function useGrantContactAccess() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ customerId, phone }: { customerId: string; phone: string }) =>
      grantContactAccess({ data: { customerId, phone } }),
    onSuccess: (_data, { customerId }) => invalidate(customerId),
  });
}

export function useRevokeContactAccess() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ customerId, phone }: { customerId: string; phone: string }) =>
      revokeContactAccess({ data: { phone } }),
    onSuccess: (_data, { customerId }) => invalidate(customerId),
  });
}
