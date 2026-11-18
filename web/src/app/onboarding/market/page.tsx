import OnboardingMarket from "@/screens/OnboardingMarket";
import { data } from "@/lib/data";
import { likedPostingIds } from "@/lib/supabase/server";
import type { MarketRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let rows: MarketRow[] = [];
  let likedLanes: string[] = [];
  try {
    const ids = await likedPostingIds();
    [rows, likedLanes] = await Promise.all([data().marketStats(), data().roleFamiliesOf(ids)]);
  } catch {
    // The screen explains when numbers aren't available.
  }
  return <OnboardingMarket rows={rows} likedLanes={likedLanes.slice(0, 4)} />;
}
