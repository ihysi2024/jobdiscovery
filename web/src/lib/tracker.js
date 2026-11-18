"use client";
// The signed-in person's job tracker ("My jobs"), in the tracked_jobs table.
// Liking a job adds it in the Liked column; the board moves it from there.
import { supabaseBrowser } from "@/lib/supabase/client";
import { currentAuthUser } from "@/lib/profile";

export const COLUMNS = [["liked", "Liked"], ["applied", "Applied"], ["interviewing", "Interviewing"], ["offer", "Offer"], ["closed", "Closed"]];

async function uid() {
  const user = await currentAuthUser();
  if (!user) throw new Error("You're signed out. Sign in again to save.");
  return user.id;
}
const sb = () => supabaseBrowser();
const fail = (what, error) => { if (error) throw new Error(`Couldn't ${what}: ${error.message}`); };

export async function listTracked() {
  const user = await currentAuthUser();
  if (!user) return [];
  const { data, error } = await sb().from("tracked_jobs").select("*").eq("user_id", user.id).order("created_at");
  fail("load your jobs", error);
  return data || [];
}

/** Ids of jobs in the tracker, for showing filled hearts. */
export async function trackedPostingIds() {
  return new Set((await listTracked()).filter((t) => t.posting_id != null).map((t) => String(t.posting_id)));
}

export async function likeJob({ postingId, title, company, url }) {
  const { error } = await sb().from("tracked_jobs").upsert(
    { user_id: await uid(), posting_id: Number(postingId), title, company, url: url || null, status: "liked" },
    { onConflict: "user_id,posting_id", ignoreDuplicates: true });
  fail("save the job", error);
}

/** Un-liking removes a job only while it's still in Liked; once applied it stays on the board. */
export async function unlikeJob(postingId) {
  const { error } = await sb().from("tracked_jobs").delete()
    .eq("user_id", await uid()).eq("posting_id", Number(postingId)).eq("status", "liked");
  fail("remove the job", error);
}

export async function moveJob(id, status) {
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === "applied") patch.applied_at = new Date().toISOString();
  if (status === "closed") { patch.focus = false; patch.backup = false; }
  const { error } = await sb().from("tracked_jobs").update(patch).eq("id", id);
  fail("move the job", error);
}

/** One focus job (and optionally one backup) at a time; pass nulls to end focus. */
export async function setFocus(focusId, backupId = null) {
  const id = await uid();
  let { error } = await sb().from("tracked_jobs").update({ focus: false, backup: false }).eq("user_id", id).or("focus.eq.true,backup.eq.true");
  fail("update focus", error);
  if (focusId != null) ({ error } = await sb().from("tracked_jobs").update({ focus: true }).eq("id", focusId));
  fail("update focus", error);
  if (backupId != null) ({ error } = await sb().from("tracked_jobs").update({ backup: true }).eq("id", backupId));
  fail("update focus", error);
}

export async function addByLink({ url, title, company, status, postingId }) {
  const row = { user_id: await uid(), url, title, company, status, posting_id: postingId ? Number(postingId) : null };
  if (status === "applied") row.applied_at = new Date().toISOString();
  const { data, error } = await sb().from("tracked_jobs").insert(row).select().single();
  fail("add the job", error);
  return data;
}

export async function removeTracked(id) {
  const { error } = await sb().from("tracked_jobs").delete().eq("id", id);
  fail("remove the job", error);
}

/** If the link is a job we already collected, use its real title and company. */
export async function findJobByUrl(url) {
  const clean = url.trim().replace(/[?#].*$/, "").replace(/\/$/, "");
  const { data } = await sb().from("job_listings").select("id, title, company_name, url")
    .in("url", [clean, clean + "/"]).limit(1);
  return data && data[0] ? { postingId: String(data[0].id), title: data[0].title, company: data[0].company_name } : null;
}
