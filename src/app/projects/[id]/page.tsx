import Overview from "@/components/dashboard/Overview";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  return <Overview project={getProject(user.company_id, id)!} />;
}
