import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — check .env.local.");
}

// Only the publishable/anon key is ever used here — this file is bundled to the
// browser. The service_role key must never be imported outside server-only code.
//
// `createBrowserClient` (not the plain `createClient`) stores the session in cookies
// instead of localStorage, so the SSR request on the next navigation can read it via
// `src/lib/api/server-client.ts` — required for route guards to see auth state before
// any component renders.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
