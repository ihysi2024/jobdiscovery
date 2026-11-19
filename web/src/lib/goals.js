"use client";
// The long-term goal fingerprint: made in this browser from setup step 3, like the
// resume's, and saved as 384 numbers (plus the text it was made from, so it's only
// remade when the goals or the field change).
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentAuthUser, loadProfile } from "@/lib/profile";
import { loadPreferences } from "@/lib/answers";
import { embedText, EMBED_MODEL } from "@/lib/embed.mjs";
import { goalText } from "@/lib/goals.mjs";

/** Make or clear the goal fingerprint if the goals changed. Returns true if it changed. */
export async function ensureGoalEmbedding() {
  const user = await currentAuthUser();
  if (!user) return false;
  const [{ row }, { profile }] = await Promise.all([loadPreferences(), loadProfile()]);
  const text = goalText(row && row.future, profile);
  if ((row && row.goal_text || "") === text && (!text || (row && row.goal_embedding))) return false;
  const fields = text
    ? { goal_text: text, goal_embedding: JSON.stringify(await embedText(text)), goal_model: EMBED_MODEL }
    : { goal_text: null, goal_embedding: null, goal_model: null };
  const { error } = await supabaseBrowser().from("preferences").update(fields).eq("user_id", user.id);
  if (error) throw new Error("Couldn't save your goals for matching: " + error.message);
  return true;
}
