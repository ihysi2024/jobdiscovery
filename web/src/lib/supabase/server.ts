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
export async function loadOwnProfile(): Promise<{ headline: string; skills: string[]; exp: { role: string }[] } | null> {
  if (!AUTH_ENABLED) return null;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("headline, skills, experience").eq("user_id", auth.user.id).maybeSingle();
  if (!data) return null;
  return { headline: data.headline || "", skills: data.skills || [], exp: data.experience || [] };
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
