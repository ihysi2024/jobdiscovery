"use client";
// The signed-in person's profile (resume details), stored in Supabase under their user id.
import { supabaseBrowser } from "@/lib/supabase/client";
import { AUTH_ENABLED } from "@/lib/supabase/env";

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
