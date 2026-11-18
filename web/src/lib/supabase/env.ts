export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
/** Sign-in needs both values; without them (local sample mode) the app runs signed out. */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
