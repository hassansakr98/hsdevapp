import ActivitiesEditor from "@/components/ActivitiesEditor";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function ActivitiesPage({ params }: PageProps<"/projects/[id]/activities">) {
  const user = await requireUser();
  const { id } = await params;
  const p = getProject(user.company_id, id)!;
  const withProgress = p.activities.filter((a) => Object.values(a.actualProgress).some((v) => v > 0)).map((a) => a.id);
  return (
    <ActivitiesEditor
      meta={{ id: p.id, contractStart: p.contractStart, contractFinish: p.contractFinish }}
      activities={p.activities}
      withProgress={withProgress}
    />
  );
}
