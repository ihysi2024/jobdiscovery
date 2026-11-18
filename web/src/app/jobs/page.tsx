import Jobs from "@/screens/Jobs";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jobs = await data().listJobs();
  return <Jobs jobs={jobs} />;
}
