import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { requireUser } from "@/lib/current-user";
import { getProject } from "@/lib/projects";

export const instant = false;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = getProject(user.company_id, id);
  if (!project) notFound();
  return (
    <Dashboard
      project={project}
      user={{ name: user.name, company: user.company_name }}
      canDelete={user.role !== "member"}
    />
  );
}
