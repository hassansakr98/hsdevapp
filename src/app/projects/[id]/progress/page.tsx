import ProgressEditor from "@/components/ProgressEditor";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function ProgressPage({ params }: PageProps<"/projects/[id]/progress">) {
  const user = await requireUser();
  const { id } = await params;
  return <ProgressEditor project={getProject(user.company_id, id)!} canDelete={user.role !== "member"} />;
}
