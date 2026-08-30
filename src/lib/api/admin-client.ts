import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * The service_role key — bypasses RLS entirely. Read via `process.env`, never
 * `import.meta.env`, so there is no ambiguity about it ever being statically inlined
 * into a client bundle the way `VITE_`-prefixed vars are (see `src/lib/api/client.ts`).
 * Must only be called from server-only code (inside a `createServerFn` handler), never
 * imported by a component or a file a component imports.
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env["VITE_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — check .env.local.");
  }

  // Plain `createClient`, not `createServerClient` from `@supabase/ssr` — this client
  // isn't bound to any user's session/cookies, it acts as the service role directly.
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
