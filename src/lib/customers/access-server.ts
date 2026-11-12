import { createServerFn } from "@tanstack/react-start";

import { createSupabaseAdminClient } from "@/lib/api/admin-client";
import { createSupabaseServerClient } from "@/lib/api/server-client";
import { toE164 } from "@/lib/phone";

async function requireAdminCaller(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("לא מחובר");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (appUser?.role !== "admin") throw new Error("פעולה זו זמינה לניהול בלבד");
}

/**
 * Grants a customer contact app access: creates their `auth.users` row (phone, no
 * password — decision 8) if one doesn't already exist for that phone, then links it to
 * the customer via `app_users`. "Has access" itself is never stored as a flag — it's
 * derived from whether an `app_users` row exists for the contact's phone (see
 * `useCustomer` in `src/hooks/use-customers.ts`), so this and `revokeContactAccess`
 * below are the only two ways that fact can change.
 */
export const grantContactAccess = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; phone: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminCaller();
    const admin = createSupabaseAdminClient();
    const phone = toE164(data.phone);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });

    let userId = created?.user?.id;

    if (createError) {
      // Phone already has an auth.users row — most likely a prior grant that was later
      // revoked (revoke only removes the app_users row, never auth.users, since
      // orders.created_by/recurring_orders.created_by reference it without cascade).
      // Look the existing user up instead of failing. GoTrue strips the leading "+"
      // when storing/matching phone numbers (confirmed empirically in supabase/seed.sql).
      const { data: existing, error: listError } = await admin.auth.admin.listUsers();
      if (listError) throw listError;
      const match = existing.users.find((u) => u.phone === phone.replace(/^\+/, ""));
      if (!match) throw createError;
      userId = match.id;
    }

    if (!userId) throw new Error("יצירת המשתמש נכשלה");

    const { error: upsertError } = await admin
      .from("app_users")
      .upsert(
        { user_id: userId, phone, role: "customer", customer_id: data.customerId },
        { onConflict: "user_id" },
      );
    if (upsertError) throw upsertError;

    return { userId };
  });

/**
 * Revokes access for a contact's phone — deletes only the `app_users` row. The
 * `auth.users` row is left in place deliberately (see comment above).
 */
export const revokeContactAccess = createServerFn({ method: "POST" })
  .validator((data: { phone: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminCaller();
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("app_users").delete().eq("phone", toE164(data.phone));
    if (error) throw error;
  });

/**
 * Hard-deletes a customer. Refused when the customer has any order or recurring order:
 * those rows reference `customers` without cascade on purpose (order history, reports and
 * documents must keep working) — for such a customer the right action is blocking. The
 * check runs first so a refusal never leaves the customer half-stripped of app access.
 * Contacts and special prices go with the customer (`on delete cascade`); `app_users`
 * rows are plain FKs, so they are removed here, via service_role (no RLS policy covers
 * them). The `auth.users` rows stay, as in `revokeContactAccess`.
 */
export const deleteCustomer = createServerFn({ method: "POST" })
  .validator((data: { customerId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminCaller();
    const admin = createSupabaseAdminClient();

    const { count: orderCount, error: ordersError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", data.customerId);
    if (ordersError) throw ordersError;

    const { count: recurringCount, error: recurringError } = await admin
      .from("recurring_orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", data.customerId);
    if (recurringError) throw recurringError;

    if ((orderCount ?? 0) > 0 || (recurringCount ?? 0) > 0) {
      throw new Error("ללקוח יש הזמנות במערכת, ולכן אי אפשר למחוק אותו. אפשר לחסום אותו במקום.");
    }

    const { error: accessError } = await admin.from("app_users").delete().eq("customer_id", data.customerId);
    if (accessError) throw accessError;

    const { error } = await admin.from("customers").delete().eq("id", data.customerId);
    if (error) throw error;
  });
