import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/current-user";
import { createDemoProject } from "@/lib/project-actions";
import { listProjects } from "@/lib/projects";

// Per-user page: render on each request after checking the session
export const instant = false;

export default async function Home() {
  const user = await requireUser();
  const projects = listProjects(user.company_id);

  return (
    <AppShell user={user}>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="ml-auto text-2xl font-semibold">المشاريع</h1>
        <form action={createDemoProject}>
          <button className="rounded-lg border border-[#2ec4b6] px-4 py-2 text-sm text-[#2ec4b6] hover:bg-[#2ec4b6]/10">
            إضافة مشروع تجريبي
          </button>
        </form>
        <Link href="/projects/new" className="rounded-lg bg-[#2ec4b6] px-4 py-2 text-sm font-semibold text-[#12303a] hover:brightness-110">
          + مشروع جديد
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl bg-[#2b2f3e] p-10 text-center text-gray-300">
          <p className="text-lg">ما في مشاريع لسا</p>
          <p className="mt-2 text-sm">
            أنشئ مشروع جديد وارفع ملف Excel، أو جرّب بمشروع تجريبي.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl bg-[#2b2f3e] p-4 transition hover:ring-2 hover:ring-[#2ec4b6]"
            >
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-300">
                <span>البداية: <span dir="ltr">{p.contract_start}</span></span>
                <span>النهاية: <span dir="ltr">{p.contract_finish}</span></span>
                <span>الأنشطة: {p.activity_count}</span>
                <span>آخر تحديث: <span dir="ltr">{p.last_data_date ?? "—"}</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
