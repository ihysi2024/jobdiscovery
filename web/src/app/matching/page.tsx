import Matching from "@/screens/Matching";
import { data } from "@/lib/data";
import { ownLanes } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const lanes = await ownLanes().catch(() => [] as string[]);
  let total: number | null = null;
  let inLanes: number | null = null;
  try {
    const [all, mine] = await Promise.all([
      data().searchJobs({ pageSize: 1 }),
      lanes.length ? data().searchJobs({ role: lanes, pageSize: 1 }) : Promise.resolve(null),
    ]);
    total = all.total;
    inLanes = mine ? mine.total : null;
  } catch {
    // counts are optional on this screen
  }
  const href = "/jobs" + (lanes.length ? "?" + lanes.map((l) => "role=" + encodeURIComponent(l)).join("&") : "");
  return <Matching total={total} inLanes={inLanes} lanes={lanes} href={href} />;
}
