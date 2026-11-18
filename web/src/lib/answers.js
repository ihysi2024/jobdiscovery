"use client";
// Onboarding answers, saved per signed-in user (tables in supabase/migrations/0001_user_data.sql).
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentAuthUser } from "@/lib/profile";

async function uid() {
  const user = await currentAuthUser();
  if (!user) throw new Error("You're signed out. Sign in again to save.");
  return user.id;
}

async function readOwn(table) {
  const user = await currentAuthUser();
  if (!user) return { user: null, row: null };
  const { data, error } = await supabaseBrowser().from(table).select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Couldn't load your answers: " + error.message);
  return { user, row: data };
}

export const loadPreferences = () => readOwn("preferences");
export const loadPlan = () => readOwn("plans");

/** Save some preference columns; columns not given keep their saved values. */
export async function savePreferences(fields) {
  const { error } = await supabaseBrowser().from("preferences")
    .upsert({ user_id: await uid(), ...fields, updated_at: new Date().toISOString() });
  if (error) throw new Error("Couldn't save: " + error.message);
}

export async function savePlan(fields) {
  const { error } = await supabaseBrowser().from("plans")
    .upsert({ user_id: await uid(), ...fields, updated_at: new Date().toISOString() });
  if (error) throw new Error("Couldn't save: " + error.message);
}

export async function saveFeedback(postingId, liked, reasons = [], note = "") {
  const { error } = await supabaseBrowser().from("job_feedback").upsert({
    user_id: await uid(), posting_id: Number(postingId), liked, reasons, note: note || null, created_at: new Date().toISOString(),
  });
  if (error) throw new Error("Couldn't save your answer: " + error.message);
}

export async function loadFeedback() {
  const user = await currentAuthUser();
  if (!user) return [];
  const { data, error } = await supabaseBrowser().from("job_feedback").select("*").eq("user_id", user.id);
  if (error) throw new Error("Couldn't load your picks: " + error.message);
  return data || [];
}
