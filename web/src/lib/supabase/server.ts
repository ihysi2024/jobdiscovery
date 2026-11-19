import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./env";

/** A Supabase client acting as the signed-in user, for server components and route handlers. */
export const supabaseServer = cache(makeServerClient);

async function makeServerClient() {
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

/**
 * The signed-in user, or null. Checked once per request (pages call this from several
 * helpers): getClaims verifies the session token's signature, locally when the project
 * signs tokens with asymmetric keys, otherwise by asking Supabase Auth.
 */
export const currentUser = cache(async (): Promise<AppUser | null> => {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims as { sub?: string; email?: string; user_metadata?: Record<string, string | undefined> } | undefined;
  if (!c?.sub) return null;
  const meta = c.user_metadata ?? {};
  return {
    id: c.sub,
    email: c.email ?? "",
    name: meta.full_name || meta.name || (c.email ?? "").split("@")[0] || "",
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
});

/** The signed-in person's preferences row (the small columns), once per request. */
const ownPreferences = cache(async () => {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await (await supabaseServer()).from("preferences")
    .select("lanes, min_fit, onboarded_at, future").eq("user_id", user.id).maybeSingle();
  return data as { lanes: string[] | null; min_fit: number | null; onboarded_at: string | null; future: OwnProfile["future"] } | null;
});

/** The signed-in person's saved profile (resume details), or null. */
export interface OwnProfile {
  headline: string; skills: string[]; exp: { role: string }[];
  future: { dreams?: string[] | null; own?: string | null; horizons?: Record<string, string> | null } | null;
}

export const loadOwnProfile = cache(async (): Promise<OwnProfile | null> => {
  const user = await currentUser();
  if (!user) return null;
  const [{ data }, pref] = await Promise.all([
    (await supabaseServer()).from("profiles").select("headline, skills, experience").eq("user_id", user.id).maybeSingle(),
    ownPreferences(),
  ]);
  if (!data) return null;
  return { headline: data.headline || "", skills: data.skills || [], exp: data.experience || [], future: (pref && pref.future) || null };
});

/** Ids of jobs the signed-in person liked in quick picks. */
export async function likedPostingIds(): Promise<string[]> {
  const user = await currentUser();
  if (!user) return [];
  const { data } = await (await supabaseServer()).from("job_feedback").select("posting_id").eq("user_id", user.id).eq("liked", true);
  return ((data ?? []) as { posting_id: number }[]).map((r) => String(r.posting_id));
}

/** Has the signed-in person finished onboarding? */
export async function onboardingDone(): Promise<boolean> {
  const pref = await ownPreferences();
  return Boolean(pref && pref.onboarded_at);
}

/** Directions the signed-in person picked in onboarding (role families). */
export async function ownLanes(): Promise<string[]> {
  const pref = await ownPreferences();
  return (pref && pref.lanes) || [];
}

/** Jobs the signed-in person already saved or liked; they're left out of the job list. */
export const ownSavedIds = cache(async (): Promise<string[]> => {
  const user = await currentUser();
  if (!user) return [];
  const supabase = await supabaseServer();
  const [t, f] = await Promise.all([
    supabase.from("tracked_jobs").select("posting_id").eq("user_id", user.id).not("posting_id", "is", null),
    supabase.from("job_feedback").select("posting_id").eq("user_id", user.id).eq("liked", true),
  ]);
  const ids = new Set<string>();
  for (const r of [...((t.data ?? []) as { posting_id: number }[]), ...((f.data ?? []) as { posting_id: number }[])]) ids.add(String(r.posting_id));
  return [...ids];
});

/** The signed-in person's minimum match percentage for Best match, or null for "any". */
export async function ownMinFit(): Promise<number | null> {
  const pref = await ownPreferences();
  return pref && typeof pref.min_fit === "number" ? pref.min_fit : null;
}
