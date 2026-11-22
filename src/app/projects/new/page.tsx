import AppShell from "@/components/AppShell";
import NewProjectForm from "@/components/NewProjectForm";
import { requireUser } from "@/lib/current-user";

export const instant = false;

export default async function NewProjectPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="mb-2 text-2xl font-semibold">مشروع جديد</h1>
      <p className="mb-4 text-sm text-gray-300">
        نزّل القالب، عبّي الأنشطة والتقدّم، وارفعه هون.{" "}
        <a href="/template" className="text-[#2ec4b6] hover:underline">القالب فاضي</a>
        {" · "}
        <a href="/template?example" className="text-[#2ec4b6] hover:underline">القالب مع بيانات مثال</a>
      </p>
      <NewProjectForm />
    </AppShell>
  );
}
