import { notFound } from "next/navigation";
import JobDetail from "@/screens/JobDetail";
import { data } from "@/lib/data";
import { explainJob } from "@/lib/data/match";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await data().getJob(decodeURIComponent(id));
  if (!job) notFound();
  const why = await explainJob(job.id, { title: job.title, summary: job.aboutText, skills: job.skills }).catch(() => null);
  if (why && why.why) job.whyParas = [why.why];
  return <JobDetail key={job.id} job={{ ...job, fit: why ? why.fit : null }} />;
}
