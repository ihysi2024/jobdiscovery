import type { DataSource } from "../types";
import { sampleSource } from "./sample";
import { supabaseSource } from "./supabase";

/** Where jobs come from: NEXT_PUBLIC_DATA_SOURCE=supabase reads the real database. */
export function data(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? supabaseSource : sampleSource;
}
