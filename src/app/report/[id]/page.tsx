import { notFound } from "next/navigation";
import Report from "@/components/Report";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const q = await searchParams;
  const project = getProject(user.company_id, id);
  if (!project) notFound();

  const last = project.dataDates.at(-1) ?? project.contractStart;
  const dataDate = q.dataDate && project.dataDates.includes(q.dataDate) ? q.dataDate : last;

  return (
    <Report
      project={project}
      filters={{
        zone: q.zone || "All",
        floor: q.floor || "All",
        category: q.category || "All",
        type: q.type || "All",
        dataDate,
      }}
      company={user.company_name}
      preparedBy={user.name}
      autoPrint={q.print === "1"}
    />
  );
}
