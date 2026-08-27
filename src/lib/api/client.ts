import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — check .env.local.");
}

// Only the publishable/anon key is ever used here — this file is bundled to the
// browser. The service_role key must never be imported outside server-only code.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
