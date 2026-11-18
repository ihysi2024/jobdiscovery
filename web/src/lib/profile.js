"use client";
// The signed-in person's profile (resume details), stored in Supabase under their user id.
import { supabaseBrowser } from "@/lib/supabase/client";
import { AUTH_ENABLED } from "@/lib/supabase/env";
import { EMBED_MODEL, embedText, profileText } from "@/lib/embed.mjs";

/** Rough years of work experience from date ranges like "2021 – 2023" or "Jun 2025 – Present". Internships count half. */
export function yearsOfExperience(exp) {
  const now = new Date().getFullYear() + new Date().getMonth() / 12;
  let total = 0;
  for (const e of exp || []) {
    const years = ((e.dates || "").match(/(?:19|20)\d{2}/g) || []).map(Number);
    if (!years.length) continue;
    const start = years[0];
    const end = /present|current|now/i.test(e.dates) ? now : years[years.length - 1] + (years.length === 1 ? 0.5 : 0);
    const span = Math.max(0.25, Math.min(end - start, 40));
    total += /intern|co-?op|student/i.test(e.role || "") ? span / 2 : span;
  }
  return Math.round(Math.min(total, 45) * 10) / 10;
}

export const EMPTY_PROFILE = { name: "", headline: "", exp: [], edu: [], skills: [], links: [], resumeName: "", resumePath: "", resumeText: "" };

export async function currentAuthUser() {
  if (!AUTH_ENABLED) return null;
  const { data } = await supabaseBrowser().auth.getUser();
  return data.user ?? null;
}

export async function loadProfile() {
  const user = await currentAuthUser();
  if (!user) return { user: null, profile: null };
  const { data, error } = await supabaseBrowser().from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Couldn't load your profile: " + error.message);
  if (!data) return { user, profile: null };
  return {
    user,
    profile: {
      name: data.name || "", headline: data.headline || "",
      exp: data.experience || [], edu: data.education || [], skills: data.skills || [], links: data.links || [],
      resumeName: data.resume_file_name || "", resumePath: data.resume_path || "", resumeText: data.resume_text || "",
      hasEmbedding: !!data.embedding_model,
    },
  };
}

export async function saveProfile(p) {
  const user = await currentAuthUser();
  if (!user) throw new Error("You're signed out. Sign in again to save.");
  const tidy = (rows, keys) => rows
    .map((r) => Object.fromEntries(keys.map((k) => [k, (r[k] || "").trim()])))
    .filter((r) => keys.some((k) => r[k]));
  const { error } = await supabaseBrowser().from("profiles").upsert({
    user_id: user.id,
    name: p.name.trim(),
    headline: p.headline.trim(),
    experience: tidy(p.exp, ["role", "org", "dates"]),
    education: tidy(p.edu, ["degree", "school", "dates"]),
    skills: p.skills.map((s) => s.trim()).filter(Boolean),
    links: p.links,
    resume_path: p.resumePath || null,
    resume_file_name: p.resumeName || null,
    resume_text: p.resumeText || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Couldn't save: " + error.message);
}

/**
 * Compute the profile's fingerprint in this browser and save it, for matching.
 * The model downloads once (about 34 MB) and is cached; the resume text never leaves the device.
 */
export async function saveProfileEmbedding(p) {
  const user = await currentAuthUser();
  if (!user) return;
  const text = profileText(p);
  if (text.replace(/\s/g, "").length < 20) return;
  const vec = await embedText(text);
  const { error } = await supabaseBrowser().from("profiles").update({
    embedding: JSON.stringify(vec), embedding_model: EMBED_MODEL, years_experience: yearsOfExperience(p.exp),
  }).eq("user_id", user.id);
  if (error) throw new Error("Couldn't save your match profile: " + error.message);
}

/** Profiles saved before matching existed get their fingerprint the first time it's needed. */
export async function ensureProfileEmbedding() {
  const { profile } = await loadProfile();
  if (!profile || profile.hasEmbedding) return false;
  await saveProfileEmbedding(profile);
  return true;
}

/** Keep the original file in private storage, at resumes/<user id>/resume.<ext>. */
export async function uploadResume(file, kind) {
  const user = await currentAuthUser();
  if (!user) throw new Error("You're signed out. Sign in again to upload.");
  const path = `${user.id}/resume.${kind}`;
  const { error } = await supabaseBrowser().storage.from("resumes").upload(path, file, {
    upsert: true, contentType: file.type || (kind === "pdf" ? "application/pdf" : undefined),
  });
  if (error) throw new Error("Couldn't upload the file: " + error.message);
  return path;
}
