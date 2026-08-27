import { createServerFn } from "@tanstack/react-start";

import { createSupabaseServerClient } from "@/lib/api/server-client";

export interface AuthContext {
  userId: string;
  phone: string | undefined;
  role: "customer" | "admin";
  customerId: string | null;
}

export type AuthResult =
  | { status: "unauthenticated" }
  /** A valid Supabase Auth session with no matching `app_users` row — never granted a role. */
  | { status: "no-access" }
  | ({ status: "ok" } & AuthContext);

/**
 * Resolves the current request's session (via cookies) into a role + customer_id.
 * Uses `getUser()`, not `getSession()`, so the session is revalidated against the Auth
 * server rather than trusting a locally-read JWT.
 */
export const getAuthContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthResult> => {
    const supabase = createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "unauthenticated" };

    const { data: appUser } = await supabase
      .from("app_users")
      .select("role, customer_id")
      .eq("user_id", user.id)
      .single();
    if (!appUser) return { status: "no-access" };

    return {
      status: "ok",
      userId: user.id,
      phone: user.phone,
      role: appUser.role,
      customerId: appUser.customer_id,
    };
  },
);
