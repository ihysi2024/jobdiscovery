import OnboardingPicks from "@/screens/OnboardingPicks";
import { data } from "@/lib/data";
import { currentUser, loadOwnProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [user, profile] = await Promise.all([currentUser(), loadOwnProfile()]);
  const seed = (user?.id ?? "guest") + new Date().toISOString().slice(0, 10);
  let deck: Awaited<ReturnType<ReturnType<typeof data>["quickPicks"]>> = [];
  try {
    deck = await data().quickPicks(profile, seed);
  } catch (e) {
    console.error("quick picks failed:", e instanceof Error ? e.message : e);
    deck = [];
  }
  return <OnboardingPicks deck={deck} />;
}
