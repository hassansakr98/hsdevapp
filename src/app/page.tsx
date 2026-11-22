import Dashboard from "@/components/Dashboard";
import { requireUser } from "@/lib/current-user";
import { sampleProject } from "@/lib/sample";

// Per-user page: render on each request after checking the session
export const instant = false;

export default async function Home() {
  const user = await requireUser();
  return <Dashboard project={sampleProject()} user={{ name: user.name, company: user.company_name }} />;
}
