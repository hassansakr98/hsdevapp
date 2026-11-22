import Analysis from "@/components/dashboard/Analysis";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function AnalysisPage({ params }: PageProps<"/projects/[id]/analysis">) {
  const user = await requireUser();
  const { id } = await params;
  return <Analysis project={getProject(user.company_id, id)!} />;
}
