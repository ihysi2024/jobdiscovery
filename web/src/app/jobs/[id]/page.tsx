import { notFound } from "next/navigation";
import JobDetail from "@/screens/JobDetail";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await data().getJob(decodeURIComponent(id));
  if (!job) notFound();
  return <JobDetail key={job.id} job={job} />;
}
