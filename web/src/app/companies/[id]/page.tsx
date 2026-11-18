import { notFound } from "next/navigation";
import Company from "@/screens/Company";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await data().getCompany(decodeURIComponent(id));
  if (!company) notFound();
  return <Company company={company} />;
}
