import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY?.trim();

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = hasSupabaseEnv ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
