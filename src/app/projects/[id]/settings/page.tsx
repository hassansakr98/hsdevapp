import ProjectSettings from "@/components/ProjectSettings";
import { requireUser } from "@/lib/current-user";
import { getAudit, getProjectMeta } from "@/lib/projects";

export const instant = false;

export default async function SettingsPage({ params }: PageProps<"/projects/[id]/settings">) {
  const user = await requireUser();
  const { id } = await params;
  const meta = getProjectMeta(user.company_id, id)!;
  return <ProjectSettings meta={meta} canDelete={user.role !== "member"} audit={getAudit(id, 100)} />;
}
