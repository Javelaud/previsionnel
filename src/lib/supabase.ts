import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Le client est créé avec des chaînes vides si les variables ne sont pas définies.
// Les appels Supabase échoueront silencieusement dans ce cas (voir db.ts).
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
