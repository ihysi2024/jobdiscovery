import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./env";

/** A Supabase client acting as the signed-in user, for server components and route handlers. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server components can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** The signed-in user, verified against Supabase Auth, or null. */
export async function currentUser(): Promise<AppUser | null> {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: u.id,
    email: u.email ?? "",
    name: meta.full_name || meta.name || (u.email ?? "").split("@")[0] || "",
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

/** The signed-in person's saved profile (resume details), or null. */
export interface OwnProfile {
  headline: string; skills: string[]; exp: { role: string }[];
  future: { dreams?: string[] | null; own?: string | null; horizons?: Record<string, string> | null } | null;
}

export async function loadOwnProfile(): Promise<OwnProfile | null> {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data }, { data: pref }] = await Promise.all([
    supabase.from("profiles").select("headline, skills, experience").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("preferences").select("future").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (!data) return null;
  return { headline: data.headline || "", skills: data.skills || [], exp: data.experience || [], future: (pref && pref.future) || null };
}

/** Ids of jobs the signed-in person liked in quick picks. */
export async function likedPostingIds(): Promise<string[]> {
  if (!AUTH_ENABLED) return [];
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("job_feedback").select("posting_id").eq("user_id", auth.user.id).eq("liked", true);
  return ((data ?? []) as { posting_id: number }[]).map((r) => String(r.posting_id));
}

/** Has the signed-in person finished onboarding? */
export async function onboardingDone(): Promise<boolean> {
  if (!AUTH_ENABLED) return false;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from("preferences").select("onboarded_at").eq("user_id", auth.user.id).maybeSingle();
  return Boolean(data && data.onboarded_at);
}

/** Directions the signed-in person picked in onboarding (role families). */
export async function ownLanes(): Promise<string[]> {
  if (!AUTH_ENABLED) return [];
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.from("preferences").select("lanes").eq("user_id", auth.user.id).maybeSingle();
  return (data && data.lanes) || [];
}

/** Jobs the signed-in person already saved or liked; they're left out of the job list. */
export async function ownSavedIds(): Promise<string[]> {
  if (!AUTH_ENABLED) return [];
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const [t, f] = await Promise.all([
    supabase.from("tracked_jobs").select("posting_id").eq("user_id", auth.user.id).not("posting_id", "is", null),
    supabase.from("job_feedback").select("posting_id").eq("user_id", auth.user.id).eq("liked", true),
  ]);
  const ids = new Set<string>();
  for (const r of [...((t.data ?? []) as { posting_id: number }[]), ...((f.data ?? []) as { posting_id: number }[])]) ids.add(String(r.posting_id));
  return [...ids];
}

/** The signed-in person's minimum match percentage for Best match, or null for "any". */
export async function ownMinFit(): Promise<number | null> {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("preferences").select("min_fit").eq("user_id", auth.user.id).maybeSingle();
  return data && typeof data.min_fit === "number" ? data.min_fit : null;
}
