import OnboardingMarket from "@/screens/OnboardingMarket";
import { data } from "@/lib/data";
import { suggestedLanes } from "@/lib/data/match";
import { likedPostingIds } from "@/lib/supabase/server";
import type { MarketRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// Each part loads on its own, so one failing doesn't blank the rest of the page.
// Failures are logged (Vercel's function logs) instead of being swallowed.
async function attempt<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[onboarding/market] ${what}:`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

export default async function Page() {
  const [rows, likedLanes, fromBackground] = await Promise.all([
    attempt<MarketRow[]>("market numbers", () => data().marketStats(), []),
    attempt<string[]>("liked roles", async () => data().roleFamiliesOf(await likedPostingIds()), []),
    attempt<string[]>("suggestions from background", () => suggestedLanes(6), []),
  ]);
  // Background and goals lead; role types of liked jobs fill in. A liked one that
  // also matches the background is shown once.
  const suggested = [...new Set([...fromBackground.slice(0, 4), ...likedLanes.slice(0, 2), ...fromBackground.slice(4)])].slice(0, 6);
  return <OnboardingMarket rows={rows} suggestedLanes={suggested} likedLanes={likedLanes} />;
}
